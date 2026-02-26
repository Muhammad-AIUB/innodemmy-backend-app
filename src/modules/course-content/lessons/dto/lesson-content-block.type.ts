export type LessonContentBlock =
  | {
      type: 'text';
      value: string;
    }
  | {
      type: 'video';
      url: string;
    }
  | {
      type: 'resource';
      url: string;
      label: string;
    };
