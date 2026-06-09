import { Component, OnInit, inject } from '@angular/core';
import { StorageService } from '../../services/storage.service';
import { AuthService } from '../../services/auth.service';

@Component({ selector: 'app-admin', standalone: false, templateUrl: './admin.html', styleUrl: './admin.scss' })
export class Admin implements OnInit {
  storage = inject(StorageService);
  auth = inject(AuthService);

  users: any[] = [];
  loading = true;
  searchQuery = '';

  // Modale Ajouter
  showAdd = false;
  addForm = { prenom: '', nom: '', email: '', password: '', quotaGb: 2 };
  addLoading = false;
  addError = '';

  // Modale Modifier
  showEdit = false;
  editTarget: any = null;
  editForm = { prenom: '', nom: '', email: '', quotaGb: 2, is_admin: false };
  editLoading = false;
  editError = '';

  // Confirmation suppression
  pendingDelete: any = null;
  deleteError = '';

  ngOnInit(): void { this.load(); }

  load(): void {
    this.storage.getAllUsers().subscribe({
      next: u => { this.users = u; this.loading = false; },
      error: () => this.loading = false
    });
  }

  get filtered(): any[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.users;
    return this.users.filter(u =>
      u.nom.toLowerCase().includes(q) ||
      u.prenom.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  }

  get activeCount(): number { return this.users.filter(u => u.is_active).length; }
  get suspendedCount(): number { return this.users.filter(u => !u.is_active).length; }
  get adminCount(): number { return this.users.filter(u => u.is_admin).length; }

  quotaPercent(u: any): number {
    if (!u.quota_max) return 0;
    return Math.min(100, Math.round((u.quota_used / u.quota_max) * 100));
  }

  // ── AJOUTER ──────────────────────────────────────────────
  openAdd(): void {
    this.addForm = { prenom: '', nom: '', email: '', password: '', quotaGb: 2 };
    this.addError = '';
    this.showAdd = true;
  }

  submitAdd(): void {
    if (!this.addForm.email || !this.addForm.prenom || !this.addForm.nom || !this.addForm.password) return;
    this.addLoading = true;
    this.addError = '';
    this.storage.createUser({
      email: this.addForm.email,
      nom: this.addForm.nom,
      prenom: this.addForm.prenom,
      password: this.addForm.password,
      quota_max: this.addForm.quotaGb * 1024 * 1024 * 1024
    }).subscribe({
      next: u => { this.users.push(u); this.showAdd = false; this.addLoading = false; },
      error: e => { this.addError = e.error?.detail || 'Erreur'; this.addLoading = false; }
    });
  }

  // ── MODIFIER ─────────────────────────────────────────────
  openEdit(u: any): void {
    this.editTarget = u;
    this.editForm = {
      prenom: u.prenom,
      nom: u.nom,
      email: u.email,
      quotaGb: Math.round(u.quota_max / (1024 * 1024 * 1024)),
      is_admin: u.is_admin
    };
    this.editError = '';
    this.showEdit = true;
  }

  submitEdit(): void {
    if (!this.editTarget) return;
    this.editLoading = true;
    this.editError = '';
    this.storage.updateUser(this.editTarget.id, {
      prenom: this.editForm.prenom,
      nom: this.editForm.nom,
      email: this.editForm.email,
      quota_max: this.editForm.quotaGb * 1024 * 1024 * 1024,
      is_admin: this.editForm.is_admin
    }).subscribe({
      next: updated => {
        const idx = this.users.findIndex(u => u.id === this.editTarget.id);
        if (idx !== -1) this.users[idx] = updated;
        this.showEdit = false;
        this.editLoading = false;
      },
      error: e => { this.editError = e.error?.detail || 'Erreur'; this.editLoading = false; }
    });
  }

  // ── BANNIR / ACTIVER ─────────────────────────────────────
  toggleUser(u: any): void {
    this.storage.toggleUser(u.id).subscribe((res: any) => {
      u.is_active = res.is_active ?? !u.is_active;
    });
  }

  // ── SUPPRIMER ────────────────────────────────────────────
  confirmDelete(u: any): void { this.pendingDelete = u; this.deleteError = ''; }

  doDelete(): void {
    if (!this.pendingDelete) return;
    this.deleteError = '';
    this.storage.deleteUser(this.pendingDelete.id).subscribe({
      next: () => { this.users = this.users.filter(u => u.id !== this.pendingDelete.id); this.pendingDelete = null; },
      error: e => { this.deleteError = e.error?.detail || 'Erreur lors de la suppression'; }
    });
  }
}
