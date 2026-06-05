import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { Dashboard } from './dashboard';
import { SharedModule } from '../../shared/shared-module';

const routes: Routes = [{ path: '', component: Dashboard }];
@NgModule({ declarations: [Dashboard], imports: [CommonModule, SharedModule, RouterModule.forChild(routes)] })
export class DashboardModule {}
