import { useRef, useState } from 'react';
import { FiRotateCw } from 'react-icons/fi';

const wrapAngle = (value) => ((((value + 180) % 360) + 360) % 360) - 180;

// Dark 3D stage for the product photo. Dragging (or the slider) turns the photo in 3D;
// past 90° it switches to the second gallery image so the turn reads as front ↔ back.
export default function ProductViewer({ image, backImage, alt }) {
  const [angle, setAngle] = useState(-16);
  const dragRef = useRef(null);
  const showBack = Boolean(backImage) && Math.abs(angle) > 90;
  const faceAngle = showBack ? angle - Math.sign(angle) * 180 : Math.max(-90, Math.min(90, angle));

  const onPointerDown = (event) => {
    dragRef.current = { x: event.clientX, start: angle };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event) => {
    if (!dragRef.current) return;
    setAngle(wrapAngle(dragRef.current.start + (event.clientX - dragRef.current.x) * 0.6));
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  return (
    <div className="main-image product-viewer">
      <span className="product-viewer-floor" aria-hidden="true" />
      <span className="product-viewer-disc" aria-hidden="true" />
      <div
        className="product-viewer-object"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <img
          src={showBack ? backImage : image}
          alt={alt}
          draggable="false"
          style={{ transform: `rotateY(${faceAngle.toFixed(1)}deg)` }}
        />
      </div>
      <label className="product-viewer-control">
        <FiRotateCw aria-hidden="true" />
        <span>Kéo để xoay 360°</span>
        <input
          type="range"
          min="-180"
          max="180"
          step="1"
          value={Math.round(angle)}
          aria-label="Xoay ảnh sản phẩm"
          onChange={(event) => setAngle(Number(event.target.value))}
        />
      </label>
    </div>
  );
}
