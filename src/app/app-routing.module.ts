import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'user-dashboard',
    loadChildren: () => import('./pages/user-dashboard/user-dashboard.module').then(m => m.UserDashboardPageModule)
  },
  {
    path: 'folder/:id',
    loadChildren: () => import('./folder/folder.module').then(m => m.FolderPageModule)
  },
  {
    path: 'service-providor-dashboard',
    loadChildren: () => import('./pages/service-providor-dashboard/service-providor-dashboard.module').then(m => m.ServiceProvidorDashboardPageModule)
  },
  {
    path: 'sign-in',
    loadChildren: () => import('./pages/sign-in/sign-in.module').then(m => m.SignInPageModule)
  },
  {
    path: 'sign-up',
    loadChildren: () => import('./pages/sign-up/sign-up.module').then(m => m.SignUpPageModule)
  },
  {
    path: 'home',
    loadChildren: () => import('./pages/home/home.module').then(m => m.HomePageModule)
  },

];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
