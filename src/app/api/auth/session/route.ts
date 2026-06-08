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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { idToken } = body;

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

    // ─── Step 2: Fetch the user profile to get workspaceId (tenantId) ─────────
    const userDoc = await adminDb.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User profile not found. Please complete registration.' },
        { status: 404 }
      );
    }

    const userProfile = userDoc.data()!;
    const workspaceId: string = userProfile.currentWorkspaceId;

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'No workspace assigned. Contact your workspace administrator.' },
        { status: 403 }
      );
    }

    // ─── Step 3: Fetch the user's role in the workspace ───────────────────────
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
    const memberRole: string = memberData.role || 'member';
    const assignedRoleIds: string[] = memberData.roles || [];

    // ─── Step 4: Fetch granular permissions from all assigned roles ───────────
    // This is exactly equivalent to the SQL JOIN on role_permissions
    const permissionsSet = new Set<string>();

    // Super admin / owner bypass — gets all permissions
    const isOwnerOrAdmin = ['owner', 'admin', 'Admin'].includes(memberRole);
    if (isOwnerOrAdmin) {
      // Owners and admins implicitly have every permission
      permissionsSet.add('*');
    } else {
      // Fetch each assigned role document and collect permissions
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
    // Like packing tenantId and permissions into a JWT — but Firebase handles
    // token signing and rotation automatically.
    await adminAuth.setCustomUserClaims(uid, {
      workspaceId,          // Tenant boundary — the hard isolation key
      role: memberRole,     // e.g. 'owner', 'admin', 'Sales Manager'
      permissions,          // Granular RBAC flags: ['crm:read', 'crm:create', ...]
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
      // Instruct client to force-refresh their ID token so the new custom
      // claims take effect immediately
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
