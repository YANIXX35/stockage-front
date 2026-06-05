import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Sidebar } from '../components/sidebar/sidebar';
import { Topbar } from '../components/topbar/topbar';

@NgModule({
  declarations: [Sidebar, Topbar],
  imports: [CommonModule, RouterModule],
  exports: [Sidebar, Topbar]
})
export class SharedModule {}
