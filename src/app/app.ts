import { Component, OnInit, inject } from '@angular/core';
import { AuthService } from './services/auth.service';

@Component({ selector: 'app-root', standalone: false, template: '<router-outlet></router-outlet>' })
export class App implements OnInit {
  private auth = inject(AuthService);
  ngOnInit(): void { if (this.auth.token) this.auth.loadMe().subscribe(); }
}
