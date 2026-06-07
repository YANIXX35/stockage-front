import { Component, inject } from '@angular/core';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({ selector: 'app-register', standalone: false, templateUrl: './register.html', styleUrl: '../auth.scss' })
export class Register {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  form = this.fb.group({
    prenom: ['', Validators.required],
    nom: ['', Validators.required],
    email: ['', Validators.required],
    password: ['', Validators.required]
  });

  otpControl = new FormControl('', Validators.required);

  step: 'form' | 'otp' = 'form';
  loading = false;
  error = '';
  resendCooldown = 0;
  private cooldownTimer: any;

  get email(): string { return this.form.get('email')?.value ?? ''; }

  sendOtp(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    this.auth.sendOtp(this.email).subscribe({
      next: () => {
        this.step = 'otp';
        this.loading = false;
        this.startCooldown();
      },
      error: (e) => { this.error = e.error?.detail || "Erreur d'envoi du code"; this.loading = false; }
    });
  }

  resend(): void {
    if (this.resendCooldown > 0) return;
    this.error = '';
    this.auth.sendOtp(this.email).subscribe({
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

  submit(): void {
    if (this.otpControl.invalid) return;
    this.loading = true;
    this.error = '';
    const { email, password, nom, prenom } = this.form.value;
    this.auth.register({ email: email!, password: password!, nom: nom!, prenom: prenom!, otp: this.otpControl.value! }).subscribe({
      next: () => {
        this.auth.login(email!, password!).subscribe({
          next: () => this.router.navigate(['/dashboard']),
          error: () => this.router.navigate(['/login/login'])
        });
      },
      error: (e) => { this.error = e.error?.detail || 'Code incorrect'; this.loading = false; }
    });
  }

  back(): void {
    this.step = 'form';
    this.otpControl.reset();
    this.error = '';
  }
}
