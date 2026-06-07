import { Component, inject } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({ selector: 'app-forgot-password', standalone: false, templateUrl: './forgot-password.html', styleUrl: '../auth.scss' })
export class ForgotPassword {
  private auth = inject(AuthService);
  private router = inject(Router);

  emailCtrl  = new FormControl('', Validators.required);
  otpCtrl    = new FormControl('', Validators.required);
  passCtrl   = new FormControl('', Validators.required);
  confirmCtrl = new FormControl('', Validators.required);

  step: 'email' | 'otp' | 'newpass' = 'email';
  loading = false;
  error = '';
  resendCooldown = 0;
  private cooldownTimer: any;

  get email(): string { return this.emailCtrl.value ?? ''; }

  sendOtp(): void {
    if (!this.email) return;
    this.loading = true;
    this.error = '';
    this.auth.forgotPassword(this.email).subscribe({
      next: () => { this.step = 'otp'; this.loading = false; this.startCooldown(); },
      error: (e) => { this.error = e.error?.detail || "Erreur d'envoi du code"; this.loading = false; }
    });
  }

  verifyOtp(): void {
    if (this.otpCtrl.invalid) return;
    this.step = 'newpass';
    this.error = '';
  }

  resetPassword(): void {
    if (this.passCtrl.invalid || this.confirmCtrl.invalid) return;
    if (this.passCtrl.value !== this.confirmCtrl.value) {
      this.error = 'Les mots de passe ne correspondent pas';
      return;
    }
    this.loading = true;
    this.error = '';
    this.auth.resetPassword(this.email, this.otpCtrl.value!, this.passCtrl.value!).subscribe({
      next: () => this.router.navigate(['/login/login']),
      error: (e) => { this.error = e.error?.detail || 'Code incorrect ou expiré'; this.loading = false; this.step = 'otp'; }
    });
  }

  resend(): void {
    if (this.resendCooldown > 0) return;
    this.error = '';
    this.auth.forgotPassword(this.email).subscribe({
      next: () => this.startCooldown(),
      error: (e) => { this.error = e.error?.detail || "Erreur d'envoi"; }
    });
  }

  private startCooldown(): void {
    this.resendCooldown = 60;
    clearInterval(this.cooldownTimer);
    this.cooldownTimer = setInterval(() => {
      this.resendCooldown--;
      if (this.resendCooldown <= 0) clearInterval(this.cooldownTimer);
    }, 1000);
  }
}
