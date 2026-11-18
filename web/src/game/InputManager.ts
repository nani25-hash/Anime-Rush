export type InputAction =
  | 'LEFT'
  | 'RIGHT'
  | 'JUMP'
  | 'SLIDE'
  | 'PAUSE'
  | 'ACTIVATE_CAR'
  | 'ACTIVATE_POWER';

export class InputManager {
  private readonly target: HTMLElement;
  private readonly onAction: (action: InputAction) => void;

  private touchStartX = 0;
  private touchStartY = 0;
  private gestureConsumed = false;
  private mouseDown = false;
  private readonly swipeThresholdPx = 22;

  constructor(target: HTMLElement, onAction: (action: InputAction) => void) {
    this.target = target;
    this.onAction = onAction;
    this.attach();
  }

  private attach(): void {
    this.target.addEventListener('touchstart', this.handleTouchStart, { passive: true });
    this.target.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.target.addEventListener('touchend', this.handleTouchEnd, { passive: true });
    this.target.addEventListener('touchcancel', this.handleTouchEnd, { passive: true });

    this.target.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);
    window.addEventListener('keydown', this.handleKeyDown);
  }

  private handleTouchStart = (e: TouchEvent): void => {
    const t = e.touches[0];
    if (!t) return;
    this.touchStartX = t.clientX;
    this.touchStartY = t.clientY;
    this.gestureConsumed = false;
  };

  private handleTouchMove = (e: TouchEvent): void => {
    if (this.gestureConsumed) return;
    const t = e.touches[0];
    if (!t) return;

    const dx = t.clientX - this.touchStartX;
    const dy = t.clientY - this.touchStartY;
    if (Math.hypot(dx, dy) < this.swipeThresholdPx) return;

    e.preventDefault();
    this.gestureConsumed = true;
    this.emitSwipe(dx, dy);
  };

  private handleTouchEnd = (): void => {
    this.gestureConsumed = false;
  };

  private handleMouseDown = (e: MouseEvent): void => {
    this.mouseDown = true;
    this.touchStartX = e.clientX;
    this.touchStartY = e.clientY;
    this.gestureConsumed = false;
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.mouseDown || this.gestureConsumed) return;
    const dx = e.clientX - this.touchStartX;
    const dy = e.clientY - this.touchStartY;
    if (Math.hypot(dx, dy) < this.swipeThresholdPx) return;
    this.gestureConsumed = true;
    this.emitSwipe(dx, dy);
  };

  private handleMouseUp = (): void => {
    this.mouseDown = false;
    this.gestureConsumed = false;
  };

  private emitSwipe(dx: number, dy: number): void {
    if (Math.abs(dx) > Math.abs(dy)) {
      this.onAction(dx < 0 ? 'LEFT' : 'RIGHT');
    } else {
      this.onAction(dy < 0 ? 'JUMP' : 'SLIDE');
    }
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.repeat) return;
    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
      case 'KeyQ':
        this.onAction('LEFT');
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.onAction('RIGHT');
        break;
      case 'ArrowUp':
      case 'KeyW':
      case 'KeyZ':
      case 'Space':
        e.preventDefault();
        this.onAction('JUMP');
        break;
      case 'ArrowDown':
      case 'KeyS':
        e.preventDefault();
        this.onAction('SLIDE');
        break;
      case 'KeyE':
      case 'KeyC':
        this.onAction('ACTIVATE_CAR');
        break;
      case 'KeyF':
      case 'KeyV':
        this.onAction('ACTIVATE_POWER');
        break;
      case 'Escape':
      case 'KeyP':
        this.onAction('PAUSE');
        break;
    }
  };

  public dispose(): void {
    this.target.removeEventListener('touchstart', this.handleTouchStart);
    this.target.removeEventListener('touchmove', this.handleTouchMove);
    this.target.removeEventListener('touchend', this.handleTouchEnd);
    this.target.removeEventListener('touchcancel', this.handleTouchEnd);
    this.target.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('keydown', this.handleKeyDown);
  }
}
