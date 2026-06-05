import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { Drive } from './drive';
import { SharedModule } from '../../shared/shared-module';

const routes: Routes = [{ path: '', component: Drive }];
@NgModule({ declarations: [Drive], imports: [CommonModule, FormsModule, SharedModule, RouterModule.forChild(routes)] })
export class DriveModule {}
