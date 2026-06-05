import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { Trash } from './trash';
import { SharedModule } from '../../shared/shared-module';

const routes: Routes = [{ path: '', component: Trash }];
@NgModule({ declarations: [Trash], imports: [CommonModule, SharedModule, RouterModule.forChild(routes)] })
export class TrashModule {}
