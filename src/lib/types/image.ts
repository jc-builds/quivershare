/** Discriminated union for images in the ImageManager component */
export type ManagedImage =
  | { kind: 'existing'; image_url: string; id: string }
  | { kind: 'new'; file: File }
  | { kind: 'uploaded'; file: File; image_url: string };
