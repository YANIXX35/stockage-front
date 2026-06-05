import { Component, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
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
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });
  loading = false;
  error = '';

  submit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    this.auth.register(this.form.value as any).subscribe({
      next: () => this.router.navigate(['/login']),
      error: (e) => { this.error = e.error?.detail || 'Erreur d\'inscription'; this.loading = false; }
    });
  }
}
