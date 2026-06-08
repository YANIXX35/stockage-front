import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { Settings } from './settings';
import { SharedModule } from '../../shared/shared-module';

const routes: Routes = [{ path: '', component: Settings }];
@NgModule({ declarations: [Settings], imports: [CommonModule, ReactiveFormsModule, SharedModule, RouterModule.forChild(routes)] })
export class SettingsModule {}
