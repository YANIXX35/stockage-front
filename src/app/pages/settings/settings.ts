import { Component, inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({ selector: 'app-settings', standalone: false, templateUrl: './settings.html', styleUrl: './settings.scss' })
export class Settings {
  auth = inject(AuthService);
}
