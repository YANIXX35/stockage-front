import { Component, OnInit, inject } from '@angular/core';
import { StorageService } from '../../services/storage.service';
import { AuthService } from '../../services/auth.service';

@Component({ selector: 'app-admin', standalone: false, templateUrl: './admin.html', styleUrl: './admin.scss' })
export class Admin implements OnInit {
  storage = inject(StorageService);
  auth = inject(AuthService);
  users: any[] = [];
  loading = true;

  ngOnInit(): void {
    this.storage.getAllUsers().subscribe({ next: u => { this.users = u; this.loading = false; }, error: () => this.loading = false });
  }

  toggleUser(id: number): void {
    this.storage.toggleUser(id).subscribe(() => { const u = this.users.find(u => u.id === id); if (u) u.is_active = !u.is_active; });
  }

  deleteUser(id: number): void {
    if (!confirm('Supprimer cet utilisateur ?')) return;
    this.storage.deleteUser(id).subscribe(() => { this.users = this.users.filter(u => u.id !== id); });
  }
}
