import { z } from "zod";
import type { JSONContent } from "@tiptap/core";
import { noteInputSchema } from "@/lib/validation";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, paginationSchema } from "./common";

export type NoteDto = {
  id: string;
  title: string;
  body: JSONContent;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

/** A Tiptap document is a JSON object; the tree itself is validated by
 * `parseNoteBody` before it reaches the provider. */
const documentSchema = z.record(z.string(), z.unknown());

const titleSchema = noteInputSchema.shape.title;
const tagsSchema = noteInputSchema.shape.tags;

export const createNoteSchema = z.strictObject({
  title: titleSchema,
  body: documentSchema,
  tags: tagsSchema.default([]),
});

export const updateNoteSchema = z
  .strictObject({
    title: titleSchema.optional(),
    body: documentSchema.optional(),
    tags: tagsSchema.optional(),
  })
  .refine(
    (value) =>
      value.title !== undefined ||
      value.body !== undefined ||
      value.tags !== undefined,
    { message: "Send at least one field to update." },
  );

export const listNotesQuerySchema = z
  .object({
    page: paginationSchema.shape.page,
    pageSize: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_PAGE_SIZE)
      .default(DEFAULT_PAGE_SIZE),
    q: z.string().trim().max(100).optional(),
    tag: z.string().trim().min(1).max(30).optional(),
  })
  .strict();

export const importNotesSchema = z.strictObject({
  notes: z
    .array(
      z.strictObject({
        title: titleSchema,
        body: documentSchema,
        tags: tagsSchema.default([]),
      }),
    )
    .min(1, "There are no notes to import.")
    .max(500, "Import up to 500 notes at a time."),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
