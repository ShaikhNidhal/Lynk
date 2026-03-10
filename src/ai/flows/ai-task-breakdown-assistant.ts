'use server';
/**
 * @fileOverview An AI assistant flow for breaking down high-level tasks into detailed sub-tasks.
 *
 * - aiTaskBreakdownAssistant - A function that handles the task breakdown process.
 * - AITaskBreakdownAssistantInput - The input type for the aiTaskBreakdownAssistant function.
 * - AITaskBreakdownAssistantOutput - The return type for the aiTaskBreakdownAssistant function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AITaskBreakdownAssistantInputSchema = z.object({
  taskDescription: z
    .string()
    .describe('The high-level task description to break down into sub-tasks.'),
});
export type AITaskBreakdownAssistantInput = z.infer<
  typeof AITaskBreakdownAssistantInputSchema
>;

const AITaskBreakdownAssistantOutputSchema = z.object({
  subtasks: z
    .array(z.string())
    .describe('An array of detailed, actionable sub-tasks derived from the main task.'),
});
export type AITaskBreakdownAssistantOutput = z.infer<
  typeof AITaskBreakdownAssistantOutputSchema
>;

export async function aiTaskBreakdownAssistant(
  input: AITaskBreakdownAssistantInput
): Promise<AITaskBreakdownAssistantOutput> {
  return aiTaskBreakdownAssistantFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiTaskBreakdownAssistantPrompt',
  input: {schema: AITaskBreakdownAssistantInputSchema},
  output: {schema: AITaskBreakdownAssistantOutputSchema},
  prompt: `You are an expert project manager and task breakdown specialist. Your goal is to take a high-level task description and break it down into a list of smaller, actionable, and manageable sub-tasks.

Consider the following high-level task:
Task: {{{taskDescription}}}

Please provide a list of sub-tasks in JSON format, ensuring each sub-task is clearly defined and actionable.`,
});

const aiTaskBreakdownAssistantFlow = ai.defineFlow(
  {
    name: 'aiTaskBreakdownAssistantFlow',
    inputSchema: AITaskBreakdownAssistantInputSchema,
    outputSchema: AITaskBreakdownAssistantOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
