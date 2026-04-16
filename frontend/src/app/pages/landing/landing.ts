import { TranslateModule } from '@ngx-translate/core';
import { Component } from '@angular/core';
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
export class LandingPage {
  constructor(public auth: Auth) {}
}
