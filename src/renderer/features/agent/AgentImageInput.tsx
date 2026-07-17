// Inline image attachment strip for the Agent tab.
// The thumbnail grid is ChatGPT-style (auto-fill) and supports remove buttons.

import { ChangeEvent, ClipboardEvent, DragEvent } from "react";
import { X } from "lucide-react";
import { IconButton } from "../../components/IconButton";

export interface AgentImage {
  id: string;
  dataUrl: string;
  name: string;
}

export function AgentImageInput({
  images,
  onPaste,
  onDragOver,
  onDrop,
  onRemove
}: {
  images: AgentImage[];
  onPaste(event: ClipboardEvent<HTMLTextAreaElement>): void;
  onDragOver(event: DragEvent<HTMLDivElement>): void;
  onDrop(event: DragEvent<HTMLDivElement>): void;
  onRemove(id: string): void;
}) {
  // The wrapper handles drag/drop; the parent renders the textarea separately.
  if (images.length === 0) {
    return null;
  }

  return (
    <div className="agent-image-grid" aria-label="已附加图片">
      {images.map((image) => (
        <figure className="agent-image-thumb" key={image.id}>
          <img src={image.dataUrl} alt={image.name} />
          <IconButton
            small
            title="移除图片"
            aria-label="移除图片"
            onClick={() => onRemove(image.id)}
          >
            <X size={14} />
          </IconButton>
        </figure>
      ))}
    </div>
  );
}

export type FileChangeHandler = (event: ChangeEvent<HTMLInputElement>) => void;
