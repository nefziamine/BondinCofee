import { Injectable, signal, computed } from '@angular/core';

export interface Notification {
  id: number;
  message: string;
  timestamp: Date;
  read: boolean;
  icon?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  // Use Signal for reactive state
  private notificationsSource = signal<Notification[]>([
    { id: 1, message: 'Bienvenue dans la Maison Bondin', timestamp: new Date(), read: false, icon: '☕' }
  ]);

  // Derived state
  notifications = computed(() => this.notificationsSource());
  unreadCount = computed(() => this.notificationsSource().filter(n => !n.read).length);

  private audioCtx: AudioContext | null = null;

  constructor() {}

  getUnreadCount(): number {
    return this.unreadCount();
  }

  markAsRead(id: number) {
    this.notificationsSource.update(list => 
      list.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }

  markAllAsRead() {
    this.notificationsSource.update(list => 
      list.map(n => ({ ...n, read: true }))
    );
  }

  addNotification(message: string, icon: string = '🔔') {
    const newNotif: Notification = {
      id: Date.now(),
      message,
      timestamp: new Date(),
      read: false,
      icon
    };
    this.notificationsSource.update(list => [newNotif, ...list]);
    this.playNotificationSound();
  }

  private playNotificationSound() {
    try {
      // WebAudio avoids shipping extra audio files.
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (this.audioCtx.state === 'suspended') {
        // Best effort; may require user interaction first in some browsers.
        void this.audioCtx.resume();
      }

      const ctx = this.audioCtx;
      const o = ctx.createOscillator();
      const g = ctx.createGain();

      o.type = 'sine';
      o.frequency.setValueAtTime(880, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.08);

      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.14);

      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.15);
    } catch {
      // ignore audio failures (autoplay restrictions, unsupported env)
    }
  }
}
