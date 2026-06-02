import {
  AfterViewChecked,
  Component,
  ElementRef,
  ViewChild,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { Auth } from '../../services/auth';
import { ChatbotService, ChatMessageDto } from '../../services/chatbot-service';

interface UiMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  image?: string; // Base64 encoded image
  replyTo?: string; // ID of message being replied to
  isEdited?: boolean;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './chatbot.html',
  styleUrl: './chatbot.scss',
})
export class ChatbotComponent implements AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  private chatbot = inject(ChatbotService);
  private auth = inject(Auth);
  private translate = inject(TranslateService);
  private sanitizer = inject(DomSanitizer);

  isOpen = signal(false);
  isLoading = signal(false);
  messages = signal<UiMessage[]>([]);
  currentMessage = '';
  selectedImage?: { name: string; data: string }; // Base64 image
  editingMessageId: string | null = null;
  replyingToId: string | null = null;
  hoveredMessageId: string | null = null;
  messageCounter = 0;

  constructor() {
    // Reload transcript whenever the auth session changes (login / logout / switch).
    effect(
      () => {
        const userId = this.auth.sessionUserId();
        this.syncWithSession(userId);
      },
      { allowSignalWrites: true }
    );
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  isVisitor(): boolean {
    return !localStorage.getItem('token');
  }

  toggleChat(): void {
    this.isOpen.update((v) => !v);
    if (this.isOpen() && this.messages().length === 0) {
      this.addBotMessage(this.welcomeText());
    }
  }

  sendMessage(text?: string): void {
    const msg = (text ?? this.currentMessage).trim();
    if ((!msg && !this.selectedImage) || this.isLoading()) return;

    // If editing, update existing message
    if (this.editingMessageId) {
      this.messages.update((m) =>
        m.map((message) =>
          message.id === this.editingMessageId
            ? { ...message, text: msg, isEdited: true, timestamp: new Date() }
            : message
        )
      );
      this.editingMessageId = null;
      this.currentMessage = '';
      return;
    }

    const messageId = `msg-${++this.messageCounter}-${Date.now()}`;
    const userMessage: UiMessage = {
      id: messageId,
      text: msg,
      isUser: true,
      timestamp: new Date(),
      image: this.selectedImage?.data,
      replyTo: this.replyingToId || undefined,
    };

    this.messages.update((m) => [...m, userMessage]);
    this.currentMessage = '';
    this.selectedImage = undefined;
    this.replyingToId = null;
    this.isLoading.set(true);

    this.chatbot.ask(msg).subscribe({
      next: (res) => {
        // Simulate loading for 2 seconds before showing response
        setTimeout(() => {
          this.isLoading.set(false);
          this.addBotMessage(res.reply);
        }, 2000);
      },
      error: () => {
        // Simulate loading for 2 seconds before showing error
        setTimeout(() => {
          this.isLoading.set(false);
          this.addBotMessage(this.translate.instant('CHATBOT.ERROR_GENERIC'));
        }, 2000);
      },
    });
  }

  deleteMessage(messageId: string): void {
    this.messages.update((m) => m.filter((message) => message.id !== messageId));
  }

  editMessage(messageId: string, text: string): void {
    this.editingMessageId = messageId;
    this.currentMessage = text;
  }

  cancelEdit(): void {
    this.editingMessageId = null;
    this.currentMessage = '';
  }

  replyToMessage(messageId: string): void {
    this.replyingToId = messageId;
  }

  cancelReply(): void {
    this.replyingToId = null;
  }

  getReplyMessage(messageId: string | undefined): UiMessage | undefined {
    if (!messageId) return undefined;
    return this.messages().find((m) => m.id === messageId);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      this.selectedImage = undefined;
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const data = e.target?.result as string;
      this.selectedImage = { name: file.name, data };
    };
    reader.readAsDataURL(file);
  }

  clearImage(): void {
    this.selectedImage = undefined;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  triggerFileInput(): void {
    this.fileInput?.nativeElement.click();
  }

  /** Clears local transcript + server-side history (only for authenticated users). */
  resetChat(): void {
    this.isLoading.set(false);
    this.currentMessage = '';

    const showWelcome = () => {
      this.messages.set([
        { id: `msg-${++this.messageCounter}-${Date.now()}`, text: this.welcomeText(), isUser: false, timestamp: new Date() },
      ]);
    };

    if (this.isVisitor()) {
      showWelcome();
      return;
    }

    this.chatbot.clearHistory().subscribe({
      next: showWelcome,
      error: showWelcome,
    });
  }

  getSafeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  trackByIndex(i: number): number {
    return i;
  }

  private addBotMessage(text: string): void {
    this.messages.update((m) => [
      ...m,
      { id: `msg-${++this.messageCounter}-${Date.now()}`, text, isUser: false, timestamp: new Date() },
    ]);
  }

  private welcomeText(): string {
    return this.translate.instant(
      this.isVisitor() ? 'CHATBOT.WELCOME_VISITOR' : 'CHATBOT.WELCOME_FULL'
    );
  }

  private syncWithSession(userId: string | null): void {
    this.isLoading.set(false);
    this.currentMessage = '';

    if (!userId) {
      this.messages.set([]);
      return;
    }

    this.chatbot.history().subscribe({
      next: (rows: ChatMessageDto[]) => {
        const formatted: UiMessage[] = (rows ?? []).map((m, index) => ({
          id: `msg-${++this.messageCounter}-${m.timestamp}`,
          text: m.content,
          isUser: m.role === 'USER',
          timestamp: new Date(m.timestamp),
        }));
        this.messages.set(formatted);
      },
      error: () => this.messages.set([]),
    });
  }

  private scrollToBottom(): void {
    const el = this.scrollContainer?.nativeElement;
    if (!el) return;
    try {
      el.scrollTop = el.scrollHeight;
    } catch {
      /* element not yet rendered */
    }
  }
}
