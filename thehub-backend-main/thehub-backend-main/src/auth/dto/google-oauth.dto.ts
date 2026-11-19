import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Corps attendu pour POST /auth/oauth/google.
 * Le idToken est produit côté client par le SDK natif (google_sign_in sur
 * Flutter), PAS par un flow de redirection navigateur — c'est la différence
 * avec l'endpoint GET /auth/oauth/google existant (flow Passport web).
 */
export class GoogleOAuthDto {
  @IsString()
  @IsNotEmpty()
  idToken!: string;
}