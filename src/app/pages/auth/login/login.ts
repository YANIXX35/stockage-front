import { Component, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { StorageService } from '../../../services/storage.service';

@Component({ selector: 'app-login', standalone: false, templateUrl: './login.html', styleUrl: '../auth.scss' })
export class Login {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private storage = inject(StorageService);
  private router = inject(Router);

  form = this.fb.group({
    email: ['', Validators.required],
    password: ['', Validators.required]
  });
  loading = false;
  error = '';
  showPass = false;

  submit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    const { email, password } = this.form.value;
    this.auth.login(email!, password!).subscribe({
      next: () => {
        // Précharge les données en arrière-plan avant d'arriver sur le dashboard
        this.storage.getFiles().pipe(catchError(() => of([]))).subscribe();
        this.storage.getFolders().pipe(catchError(() => of([]))).subscribe();
        this.router.navigate(['/dashboard']);
      },
      error: (e) => { this.error = e.error?.detail || 'Erreur de connexion'; this.loading = false; }
    });
  }
}
