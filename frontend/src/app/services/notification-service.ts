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
  }
}
