import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  selector: 'app-landing',
  templateUrl: './landing.html',
  styleUrl: './landing.css',
})
export class LandingPage {}
