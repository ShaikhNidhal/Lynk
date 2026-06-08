/**
 * POST /api/auth/session
 *
 * The Firebase equivalent of a JWT-based login endpoint.
 *
 * Flow:
 * 1. Client calls Firebase signInWithEmailAndPassword → gets a Firebase ID Token
 * 2. Client POSTs that ID token to this endpoint
 * 3. We verify the token with Admin SDK (like jwt.verify)
 * 4. We fetch the user's workspaceId (tenantId) + granular RBAC permissions from Firestore
 * 5. We set those as Firebase Custom Claims (embedded in the token going forward)
 * 6. We return the session context: userId, workspaceId, role, permissions
 *
 * From this point on, every Firebase ID Token refresh will contain the custom
 * claims, so server-side middleware can read workspaceId and permissions directly
 * from the token without a Firestore round-trip.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { idToken, firstName: regFirstName, lastName: regLastName, workspaceName: regWorkspaceName } = body;

    if (!idToken) {
      return NextResponse.json(
        { error: 'Missing ID token. The client must send a Firebase ID token.' },
        { status: 400 }
      );
    }

    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    // ─── Step 1: Verify the Firebase ID Token (equivalent to jwt.verify) ──────
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (err) {
      return NextResponse.json(
        { error: 'Invalid or expired session token. Please sign in again.' },
        { status: 401 }
      );
    }

    const uid = decodedToken.uid;
    const email = decodedToken.email || '';

    // ─── Step 2: Fetch or Self-Heal User Profile and Workspace ────────────────
    let userDoc = await adminDb.collection('users').doc(uid).get();
    let workspaceId = '';
    let memberRole = 'member';
    let assignedRoleIds: string[] = [];

    if (!userDoc.exists) {
      console.log(`[API Auth Session] Profile for ${uid} does not exist. Initializing server-side self-healing...`);
      
      const emailPrefix = email.split('@')[0] || 'User';
      const firstName = regFirstName || emailPrefix;
      const lastName = regLastName || '';
      const workspaceName = regWorkspaceName || `${firstName}'s Workspace`;
      const fallbackWorkspaceId = `ws-${uid}`;

      const adminDbBatch = adminDb.batch();

      // 1. Create Workspace
      const workspaceRef = adminDb.collection('workspaces').doc(fallbackWorkspaceId);
      adminDbBatch.set(workspaceRef, {
        id: fallbackWorkspaceId,
        name: workspaceName,
        slug: workspaceName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        planType: 'pro',
        ownerId: uid,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Seed default roles out-of-the-box
      const defaultRoles = [
        {
          id: 'role_workspace_administrator',
          name: 'Workspace Administrator',
          permissions: [
            'crm:read', 'crm:create', 'crm:update', 'crm:delete',
            'projects:read', 'projects:create', 'projects:update', 'projects:delete',
            'tasks:create', 'tasks:update', 'tasks:delete',
            'settings:read', 'settings:write'
          ]
        },
        {
          id: 'role_sales_manager',
          name: 'Sales Manager',
          permissions: [
            'crm:read', 'crm:create', 'crm:update', 'crm:delete',
            'projects:read', 'projects:create', 'projects:update',
            'tasks:create', 'tasks:update'
          ]
        },
        {
          id: 'role_standard_rep',
          name: 'Standard Executive Account Representative',
          permissions: [
            'crm:read', 'crm:create', 'crm:update',
            'projects:read',
            'tasks:create', 'tasks:update'
          ]
        }
      ];

      defaultRoles.forEach(role => {
        const roleRef = workspaceRef.collection('roles').doc(role.id);
        adminDbBatch.set(roleRef, {
          id: role.id,
          name: role.name,
          permissions: role.permissions,
          createdAt: FieldValue.serverTimestamp(),
        });
      });

      // 2. Create Workspace Membership
      const isAdminEmail = email === 'nidhal.shaikh@gmail.com';
      memberRole = isAdminEmail ? 'Admin' : 'owner';
      assignedRoleIds = ['role_workspace_administrator'];

      const memberRef = workspaceRef.collection('members').doc(uid);
      adminDbBatch.set(memberRef, {
        id: uid,
        workspaceId: fallbackWorkspaceId,
        userId: uid,
        role: memberRole,
        roles: assignedRoleIds,
        email,
        firstName,
        lastName,
        joinedAt: FieldValue.serverTimestamp(),
      });

      // 3. Create User Profile document
      const userRef = adminDb.collection('users').doc(uid);
      adminDbBatch.set(userRef, {
        id: uid,
        firstName,
        lastName,
        email,
        role: isAdminEmail ? 'Admin' : 'Team Member',
        currentWorkspaceId: fallbackWorkspaceId,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Commit all writes atomically
      await adminDbBatch.commit();
      workspaceId = fallbackWorkspaceId;

      console.log(`[API Auth Session] Server-side self-healing successful for UID: ${uid}`);
    } else {
      const userProfile = userDoc.data()!;
      workspaceId = userProfile.currentWorkspaceId;

      if (!workspaceId) {
        return NextResponse.json(
          { error: 'No workspace assigned. Contact your workspace administrator.' },
          { status: 403 }
        );
      }

      // ─── Step 3: Fetch the user's role in the workspace ─────────────────────
      const memberDoc = await adminDb
        .collection('workspaces')
        .doc(workspaceId)
        .collection('members')
        .doc(uid)
        .get();

      if (!memberDoc.exists) {
        return NextResponse.json(
          { error: 'Not a member of any workspace. Contact your administrator.' },
          { status: 403 }
        );
      }

      const memberData = memberDoc.data()!;
      memberRole = memberData.role || 'member';
      assignedRoleIds = memberData.roles || [];
    }

    // ─── Step 4: Fetch granular permissions from all assigned roles ───────────
    const permissionsSet = new Set<string>();

    // Super admin / owner bypass
    const isOwnerOrAdmin = ['owner', 'admin', 'Admin'].includes(memberRole);
    if (isOwnerOrAdmin) {
      permissionsSet.add('*');
    } else {
      const rolePromises = assignedRoleIds.map((roleId) =>
        adminDb
          .collection('workspaces')
          .doc(workspaceId)
          .collection('roles')
          .doc(roleId)
          .get()
      );

      const roleDocs = await Promise.all(rolePromises);
      for (const roleDoc of roleDocs) {
        if (roleDoc.exists) {
          const roleData = roleDoc.data()!;
          const rolePermissions: string[] = roleData.permissions || [];
          rolePermissions.forEach((p) => permissionsSet.add(p));
        }
      }
    }

    const permissions = Array.from(permissionsSet);

    // ─── Step 5: Set Firebase Custom Claims (embed tenantId + perms in token) ─
    await adminAuth.setCustomUserClaims(uid, {
      workspaceId,          // Tenant boundary — the hard isolation key
      role: memberRole,     // e.g. 'owner', 'admin', 'Sales Manager'
      permissions,          // Granular RBAC flags
    });

    // ─── Step 6: Return the session context and set secure __session cookie ───
    const response = NextResponse.json({
      success: true,
      session: {
        userId: uid,
        email,
        workspaceId,
        role: memberRole,
        permissions,
      },
      requiresTokenRefresh: true,
    });

    // Set HttpOnly cookie for Next.js Middleware check (expires in 1 hour matching ID token)
    response.cookies.set('__session', idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60, // 1 hour
      path: '/'
    });

    return response;

  } catch (error: any) {
    console.error('[/api/auth/session] Internal error:', error);
    return NextResponse.json(
      { error: 'Internal authentication error. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  // Validate an existing session (useful for server-side page guards)
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return NextResponse.json({ error: 'No session token provided.' }, { status: 401 });
  }

  try {
    const adminAuth = getAdminAuth();
    const decoded = await adminAuth.verifyIdToken(token);

    return NextResponse.json({
      valid: true,
      userId: decoded.uid,
      email: decoded.email,
      workspaceId: decoded.workspaceId || null,
      role: decoded.role || null,
      permissions: decoded.permissions || [],
    });
  } catch {
    return NextResponse.json({ valid: false, error: 'Token expired or invalid.' }, { status: 401 });
  }
}
