import { Component, inject } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

@Component({ selector: 'app-settings', standalone: false, templateUrl: './settings.html', styleUrl: './settings.scss' })
export class Settings {
  auth = inject(AuthService);
  private http = inject(HttpClient);

  currentPassCtrl = new FormControl('', Validators.required);
  newPassCtrl     = new FormControl('', [Validators.required, Validators.minLength(6)]);
  confirmCtrl     = new FormControl('', Validators.required);

  passLoading = false;
  passSuccess = '';
  passError   = '';

  changePassword(): void {
    this.passSuccess = '';
    this.passError   = '';
    if (this.newPassCtrl.value !== this.confirmCtrl.value) {
      this.passError = 'Les mots de passe ne correspondent pas';
      return;
    }
    if (this.newPassCtrl.invalid || this.currentPassCtrl.invalid) return;
    this.passLoading = true;
    this.http.put(`${environment.apiUrl}/auth/change-password`, {
      current_password: this.currentPassCtrl.value,
      new_password: this.newPassCtrl.value,
    }).subscribe({
      next: () => {
        this.passLoading = false;
        this.passSuccess = 'Mot de passe modifié avec succès !';
        this.currentPassCtrl.reset();
        this.newPassCtrl.reset();
        this.confirmCtrl.reset();
      },
      error: (e) => {
        this.passLoading = false;
        this.passError = e.error?.detail || 'Erreur lors du changement de mot de passe';
      }
    });
  }
}
