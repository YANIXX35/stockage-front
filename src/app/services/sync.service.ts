import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SyncService {
  private _count = 0;

  readonly syncing = signal(false);
  readonly offline = signal(typeof navigator !== 'undefined' ? !navigator.onLine : false);

  start(): void {
    this._count++;
    this.syncing.set(true);
  }

  done(): void {
    this._count = Math.max(0, this._count - 1);
    if (this._count === 0) this.syncing.set(false);
  }

  setOffline(v: boolean): void {
    this.offline.set(v);
  }
}
