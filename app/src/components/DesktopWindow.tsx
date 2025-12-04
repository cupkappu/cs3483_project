import type { ReactNode } from "react";
import {
  Rnd,
  type RndDragCallback,
  type RndResizeCallback,
} from "react-rnd";

interface WindowPosition {
  x: number;
  y: number;
}

interface WindowSize {
  width: number;
  height: number;
}

interface DesktopWindowProps {
  title: string;
  position: WindowPosition;
  size: WindowSize;
  zIndex: number;
  minWidth?: number;
  minHeight?: number;
  isResizable?: boolean;
  onFocus: () => void;
  onMove: (position: WindowPosition) => void;
  onResize: (size: WindowSize, position: WindowPosition) => void;
  onMinimize?: () => void;
  onClose?: () => void;
  children: ReactNode;
}

export default function DesktopWindow({
  title,
  position,
  size,
  zIndex,
  minWidth,
  minHeight,
  isResizable = true,
  onFocus,
  onMove,
  onResize,
  onMinimize,
  onClose,
  children,
}: DesktopWindowProps) {
  const handleDragStop: RndDragCallback = (_event, data) => {
    onMove({ x: data.x, y: data.y });
  };

  const handleResizeStop: RndResizeCallback = (
    _event,
    _direction,
    elementRef,
    _delta,
    positionResult,
  ) => {
    const nextSize: WindowSize = {
      width: elementRef.offsetWidth,
      height: elementRef.offsetHeight,
    };
    onResize(nextSize, { x: positionResult.x, y: positionResult.y });
  };

  return (
    <Rnd
      size={{ width: size.width, height: size.height }}
      position={{ x: position.x, y: position.y }}
      bounds="parent"
      minWidth={minWidth}
      minHeight={minHeight}
      enableResizing={isResizable}
      dragHandleClassName="desktop-window__titlebar"
      onDragStop={handleDragStop}
      onResizeStop={handleResizeStop}
      onMouseDown={onFocus}
      style={{ zIndex }}
      className="desktop-window"
    >
      <div className="desktop-window__chrome">
        <header className="desktop-window__titlebar">
          <span className="desktop-window__title">{title}</span>
          <div className="desktop-window__actions">
            {onMinimize && (
              <button
                type="button"
                className="desktop-window__button"
                aria-label="Minimize window"
                onClick={onMinimize}
              >
                -
              </button>
            )}
            {onClose && (
              <button
                type="button"
                className="desktop-window__button desktop-window__button--close"
                aria-label="Close window"
                onClick={onClose}
              >
                x
              </button>
            )}
          </div>
        </header>
        <div className="desktop-window__content">{children}</div>
      </div>
    </Rnd>
  );
}
