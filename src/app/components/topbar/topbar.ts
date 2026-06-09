import { Component, Input, inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { UiService } from '../../services/ui.service';
import { SyncService } from '../../services/sync.service';

@Component({
  selector: 'app-topbar',
  standalone: false,
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss'
})
export class Topbar {
  @Input() title = '';
  auth = inject(AuthService);
  ui   = inject(UiService);
  sync = inject(SyncService);
}
