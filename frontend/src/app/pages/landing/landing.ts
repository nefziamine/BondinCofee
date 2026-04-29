import { TranslateModule } from '@ngx-translate/core';
import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Auth } from '../../services/auth';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  selector: 'app-landing',
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class LandingPage implements OnInit, OnDestroy {
  currentSlide = signal(0);
  slides = [
    'assets/images/hero_background.png',
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=2070',
    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=1974',
    'https://images.unsplash.com/photo-1447933601403-0c6688de566e?q=80&w=1961'
  ];
  private slideInterval: any;

  constructor(public auth: Auth) {}

  ngOnInit() {
    this.startSlideshow();
  }

  ngOnDestroy() {
    if (this.slideInterval) clearInterval(this.slideInterval);
  }

  private startSlideshow() {
    this.slideInterval = setInterval(() => {
      this.currentSlide.update(idx => (idx + 1) % this.slides.length);
    }, 5000);
  }
}
