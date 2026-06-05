import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { Admin } from './admin';
import { SharedModule } from '../../shared/shared-module';

const routes: Routes = [{ path: '', component: Admin }];
@NgModule({ declarations: [Admin], imports: [CommonModule, SharedModule, RouterModule.forChild(routes)] })
export class AdminModule {}
