import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({ selector: 'app-forgot-password', standalone: false, templateUrl: './forgot-password.html', styleUrl: '../auth.scss' })
export class ForgotPassword {
  private auth = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  emailCtrl   = new FormControl('', Validators.required);
  otpCtrl     = new FormControl('', Validators.required);
  passCtrl    = new FormControl('', Validators.required);
  confirmCtrl = new FormControl('', Validators.required);

  step: 'email' | 'otp' | 'newpass' = 'email';
  loading = false;
  showPass = false;
  slowServer = false;
  error = '';
  resendCooldown = 0;
  private cooldownTimer: any;
  private slowTimer: any;

  get email(): string { return this.emailCtrl.value ?? ''; }

  sendOtp(): void {
    if (!this.email) return;
    this.loading = true;
    this.slowServer = false;
    this.error = '';
    this.slowTimer = setTimeout(() => { this.slowServer = true; this.cdr.detectChanges(); }, 8000);
    this.auth.forgotPassword(this.email).subscribe({
      next: () => {
        clearTimeout(this.slowTimer);
        this.step = 'otp';
        this.loading = false;
        this.slowServer = false;
        this.startCooldown();
        this.cdr.detectChanges();
      },
      error: (e) => {
        clearTimeout(this.slowTimer);
        this.error = e.error?.detail || "Erreur d'envoi du code";
        this.loading = false;
        this.slowServer = false;
        this.cdr.detectChanges();
      }
    });
  }

  verifyOtp(): void {
    if (this.otpCtrl.invalid) return;
    this.step = 'newpass';
    this.error = '';
    this.cdr.detectChanges();
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
      error: (e) => {
        this.error = e.error?.detail || 'Code incorrect ou expiré';
        this.loading = false;
        this.step = 'otp';
        this.cdr.detectChanges();
      }
    });
  }

  resend(): void {
    if (this.resendCooldown > 0) return;
    this.error = '';
    this.auth.forgotPassword(this.email).subscribe({
      next: () => { this.startCooldown(); this.cdr.detectChanges(); },
      error: (e) => { this.error = e.error?.detail || "Erreur d'envoi"; this.cdr.detectChanges(); }
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
