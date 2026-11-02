import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createAuthService } from './auth.service.js';
import { AppError } from '../utils/AppError.js';
import * as passwordService from './password.service.js';
import * as tokenService from './token.service.js';

describe('auth.service', () => {
  const testConfig = {
    jwtSecret: 'test_secret_for_auth_service_32_characters_long_min',
    bcryptCost: 4, // Fast for tests
  };

  function createFakeUserRepo() {
    let nextId = 1;
    const users = [];

    return {
      users,
      async createUser({ email, username, passwordHash }) {
        if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
          const err = new Error('duplicate key value violates unique constraint');
          err.code = '23505';
          err.constraint = 'users_email_lower_key';
          throw err;
        }
        if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
          const err = new Error('duplicate key value violates unique constraint');
          err.code = '23505';
          err.constraint = 'users_username_lower_key';
          throw err;
        }

        const newUser = {
          id: String(nextId++),
          email,
          username,
          password_hash: passwordHash,
          token_version: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        users.push(newUser);

        return {
          id: newUser.id,
          email: newUser.email,
          username: newUser.username,
          tokenVersion: newUser.token_version,
          createdAt: newUser.created_at,
          updatedAt: newUser.updated_at,
        };
      },

      async findByIdentifier(identifier) {
        const found = users.find(
          (u) =>
            u.email.toLowerCase() === identifier.toLowerCase() ||
            u.username.toLowerCase() === identifier.toLowerCase()
        );
        if (!found) return null;
        return {
          id: found.id,
          email: found.email,
          username: found.username,
          password_hash: found.password_hash,
          tokenVersion: found.token_version,
          createdAt: found.created_at,
          updatedAt: found.updated_at,
        };
      },

      async findById(id) {
        const found = users.find((u) => String(u.id) === String(id));
        if (!found) return null;
        return {
          id: found.id,
          email: found.email,
          username: found.username,
          tokenVersion: found.token_version,
          createdAt: found.created_at,
          updatedAt: found.updated_at,
        };
      },

      async incrementTokenVersion(id) {
        const found = users.find((u) => String(u.id) === String(id));
        if (!found) return null;
        found.token_version += 1;
        found.updated_at = new Date().toISOString();
        return {
          id: found.id,
          tokenVersion: found.token_version,
        };
      },
    };
  }

  describe('register', () => {
    it('successfully registers a user with normalized email and safe returned fields', async () => {
      const userRepo = createFakeUserRepo();
      const authService = createAuthService({
        userRepo,
        passwordService,
        tokenService,
        config: testConfig,
      });

      const result = await authService.register({
        email: '  Alice@EXAMPLE.com  ',
        username: 'alice_01',
        password: 'ValidPassword123!',
      });

      assert.equal(result.email, 'alice@example.com');
      assert.equal(result.username, 'alice_01');
      assert.equal(typeof result.id, 'string');
      assert.equal(typeof result.createdAt, 'string');
      assert.equal(result.password, undefined);
      assert.equal(result.password_hash, undefined);
      assert.equal(result.passwordHash, undefined);
    });

    it('rejects duplicate email with 409 EMAIL_TAKEN', async () => {
      const userRepo = createFakeUserRepo();
      const authService = createAuthService({
        userRepo,
        passwordService,
        tokenService,
        config: testConfig,
      });

      await authService.register({
        email: 'bob@example.com',
        username: 'bob_the_first',
        password: 'password123',
      });

      await assert.rejects(
        () =>
          authService.register({
            email: 'BOB@example.com',
            username: 'bob_the_second',
            password: 'password123',
          }),
        (err) => {
          assert.equal(err instanceof AppError, true);
          assert.equal(err.statusCode, 409);
          assert.equal(err.code, 'EMAIL_TAKEN');
          assert.equal(err.message, 'Email already registered');
          return true;
        }
      );
    });

    it('rejects duplicate username with 409 USERNAME_TAKEN', async () => {
      const userRepo = createFakeUserRepo();
      const authService = createAuthService({
        userRepo,
        passwordService,
        tokenService,
        config: testConfig,
      });

      await authService.register({
        email: 'charlie1@example.com',
        username: 'charlie_dev',
        password: 'password123',
      });

      await assert.rejects(
        () =>
          authService.register({
            email: 'charlie2@example.com',
            username: 'charlie_dev',
            password: 'password123',
          }),
        (err) => {
          assert.equal(err instanceof AppError, true);
          assert.equal(err.statusCode, 409);
          assert.equal(err.code, 'USERNAME_TAKEN');
          assert.equal(err.message, 'Username already taken');
          return true;
        }
      );
    });

    it('re-throws unhandled database errors', async () => {
      const userRepo = {
        async createUser() {
          throw new Error('Connection refused');
        },
      };
      const authService = createAuthService({
        userRepo,
        passwordService,
        tokenService,
        config: testConfig,
      });

      await assert.rejects(
        () =>
          authService.register({
            email: 'dave@example.com',
            username: 'dave_dev',
            password: 'password123',
          }),
        /Connection refused/
      );
    });

    it('validates password byte length boundaries (8 to 72 bytes)', async () => {
      const userRepo = createFakeUserRepo();
      const authService = createAuthService({
        userRepo,
        passwordService,
        tokenService,
        config: testConfig,
      });

      // Too short (< 8 bytes)
      await assert.rejects(
        () =>
          authService.register({
            email: 'short@example.com',
            username: 'short_pass',
            password: '1234567',
          }),
        (err) => {
          assert.equal(err instanceof AppError, true);
          assert.equal(err.statusCode, 400);
          assert.equal(err.code, 'VALIDATION_ERROR');
          assert.equal(err.message.includes('1234567'), false);
          return true;
        }
      );

      // Too long (> 72 bytes)
      const longPass = 'a'.repeat(73);
      await assert.rejects(
        () =>
          authService.register({
            email: 'long@example.com',
            username: 'long_pass',
            password: longPass,
          }),
        (err) => {
          assert.equal(err instanceof AppError, true);
          assert.equal(err.statusCode, 400);
          assert.equal(err.code, 'VALIDATION_ERROR');
          assert.equal(err.message.includes(longPass), false);
          return true;
        }
      );

      // Multi-byte utf-8 exceeding 72 bytes
      const multiBytePass = '€'.repeat(25); // 25 * 3 = 75 bytes
      await assert.rejects(
        () =>
          authService.register({
            email: 'multibyte@example.com',
            username: 'multibyte_user',
            password: multiBytePass,
          }),
        (err) => {
          assert.equal(err instanceof AppError, true);
          assert.equal(err.statusCode, 400);
          assert.equal(err.code, 'VALIDATION_ERROR');
          return true;
        }
      );
    });

    it('validates username format and rejects invalid usernames', async () => {
      const userRepo = createFakeUserRepo();
      const authService = createAuthService({
        userRepo,
        passwordService,
        tokenService,
        config: testConfig,
      });

      const badUsernames = ['ab', 'a'.repeat(31), 'user@name', 'user-name', 'user name', ''];
      for (const username of badUsernames) {
        await assert.rejects(
          () =>
            authService.register({
              email: 'test@example.com',
              username,
              password: 'validPassword123',
            }),
          (err) => {
            assert.equal(err instanceof AppError, true);
            assert.equal(err.statusCode, 400);
            assert.equal(err.code, 'VALIDATION_ERROR');
            return true;
          }
        );
      }
    });

    it('validates email format and rejects bad emails', async () => {
      const userRepo = createFakeUserRepo();
      const authService = createAuthService({
        userRepo,
        passwordService,
        tokenService,
        config: testConfig,
      });

      const badEmails = [
        'plainaddress',
        '@nodomain.com',
        'no@domain',
        'no@domain.',
        'no@.domain.com',
        'two@@domain.com',
        'ab',
        'a'.repeat(255) + '@test.com',
        null,
        123,
      ];
      for (const email of badEmails) {
        await assert.rejects(
          () =>
            authService.register({
              email,
              username: 'valid_user',
              password: 'validPassword123',
            }),
          (err) => {
            assert.equal(err instanceof AppError, true);
            assert.equal(err.statusCode, 400);
            assert.equal(err.code, 'VALIDATION_ERROR');
            return true;
          }
        );
      }
    });
  });

  describe('login', () => {
    it('authenticates successfully with email', async () => {
      const userRepo = createFakeUserRepo();
      const authService = createAuthService({
        userRepo,
        passwordService,
        tokenService,
        config: testConfig,
      });

      await authService.register({
        email: 'user1@example.com',
        username: 'user_one',
        password: 'ValidPassword123!',
      });

      const result = await authService.login({
        identifier: 'user1@example.com',
        password: 'ValidPassword123!',
      });

      assert.equal(result.user.email, 'user1@example.com');
      assert.equal(result.user.username, 'user_one');
      assert.equal(typeof result.token, 'string');
    });

    it('authenticates successfully with username case-insensitively', async () => {
      const userRepo = createFakeUserRepo();
      const authService = createAuthService({
        userRepo,
        passwordService,
        tokenService,
        config: testConfig,
      });

      await authService.register({
        email: 'user2@example.com',
        username: 'user_two',
        password: 'ValidPassword123!',
      });

      const result = await authService.login({
        identifier: 'USER_TWO',
        password: 'ValidPassword123!',
      });

      assert.equal(result.user.email, 'user2@example.com');
      assert.equal(result.user.username, 'user_two');
      assert.equal(typeof result.token, 'string');
    });

    it('equalizes timing on unknown user and returns identical 401 INVALID_CREDENTIALS error', async () => {
      const userRepo = createFakeUserRepo();
      let verifyPasswordCalls = 0;
      let lastVerifiedHash = null;

      const spiedPasswordService = {
        ...passwordService,
        async verifyPassword(plain, hash) {
          verifyPasswordCalls++;
          lastVerifiedHash = hash;
          return passwordService.verifyPassword(plain, hash);
        },
      };

      const authService = createAuthService({
        userRepo,
        passwordService: spiedPasswordService,
        tokenService,
        config: testConfig,
      });

      await authService.register({
        email: 'existing@example.com',
        username: 'existing_user',
        password: 'Password123!',
      });

      // 1. Unknown user login attempt
      verifyPasswordCalls = 0;
      let unknownUserError;
      try {
        await authService.login({
          identifier: 'nonexistent@example.com',
          password: 'AttemptPassword123!',
        });
      } catch (err) {
        unknownUserError = err;
      }

      assert.equal(unknownUserError instanceof AppError, true);
      assert.equal(unknownUserError.statusCode, 401);
      assert.equal(unknownUserError.code, 'INVALID_CREDENTIALS');
      assert.equal(unknownUserError.message, 'Invalid credentials');
      assert.equal(verifyPasswordCalls, 1, 'verifyPassword must be called for unknown user to prevent timing leak');
      assert.match(lastVerifiedHash, /^\$2[aby]\$\d{2}\$/);

      // 2. Wrong password attempt
      let wrongPassError;
      try {
        await authService.login({
          identifier: 'existing@example.com',
          password: 'WrongPassword123!',
        });
      } catch (err) {
        wrongPassError = err;
      }

      assert.equal(wrongPassError instanceof AppError, true);
      assert.equal(wrongPassError.statusCode, 401);
      assert.equal(wrongPassError.code, 'INVALID_CREDENTIALS');
      assert.equal(wrongPassError.message, 'Invalid credentials');

      // Both errors must have identical status, code, and message
      assert.equal(unknownUserError.statusCode, wrongPassError.statusCode);
      assert.equal(unknownUserError.code, wrongPassError.code);
      assert.equal(unknownUserError.message, wrongPassError.message);
    });

    it('validates login input data', async () => {
      const userRepo = createFakeUserRepo();
      const authService = createAuthService({
        userRepo,
        passwordService,
        tokenService,
        config: testConfig,
      });

      await assert.rejects(
        () => authService.login(null),
        (err) => {
          assert.equal(err instanceof AppError, true);
          assert.equal(err.statusCode, 400);
          assert.equal(err.code, 'VALIDATION_ERROR');
          return true;
        }
      );

      await assert.rejects(
        () => authService.login({ identifier: '', password: 'pwd' }),
        (err) => {
          assert.equal(err instanceof AppError, true);
          assert.equal(err.statusCode, 400);
          assert.equal(err.code, 'VALIDATION_ERROR');
          return true;
        }
      );

      await assert.rejects(
        () => authService.login({ identifier: 'user', password: 'a'.repeat(73) }),
        (err) => {
          assert.equal(err instanceof AppError, true);
          assert.equal(err.statusCode, 400);
          assert.equal(err.code, 'VALIDATION_ERROR');
          return true;
        }
      );
    });
  });

  describe('logout', () => {
    it('increments token version on logout', async () => {
      const userRepo = createFakeUserRepo();
      const authService = createAuthService({
        userRepo,
        passwordService,
        tokenService,
        config: testConfig,
      });

      const registered = await authService.register({
        email: 'logout_test@example.com',
        username: 'logout_user',
        password: 'ValidPassword123!',
      });

      const userBefore = await userRepo.findById(registered.id);
      assert.equal(userBefore.tokenVersion, 0);

      const logoutResult = await authService.logout(registered.id);
      assert.equal(logoutResult.success, true);

      const userAfter = await userRepo.findById(registered.id);
      assert.equal(userAfter.tokenVersion, 1);
    });

    it('rejects logout without userId', async () => {
      const authService = createAuthService({ config: testConfig });
      await assert.rejects(
        () => authService.logout(''),
        (err) => {
          assert.equal(err instanceof AppError, true);
          assert.equal(err.statusCode, 400);
          assert.equal(err.code, 'VALIDATION_ERROR');
          return true;
        }
      );
    });
  });

  describe('getCurrentUser', () => {
    it('retrieves current user without password fields', async () => {
      const userRepo = createFakeUserRepo();
      const authService = createAuthService({
        userRepo,
        passwordService,
        tokenService,
        config: testConfig,
      });

      const registered = await authService.register({
        email: 'me@example.com',
        username: 'me_user',
        password: 'ValidPassword123!',
      });

      const me = await authService.getCurrentUser(registered.id);
      assert.equal(me.id, registered.id);
      assert.equal(me.email, 'me@example.com');
      assert.equal(me.username, 'me_user');
      assert.equal(typeof me.createdAt, 'string');
      assert.equal(me.password, undefined);
      assert.equal(me.password_hash, undefined);
    });

    it('throws 401 UNAUTHENTICATED if user does not exist', async () => {
      const userRepo = createFakeUserRepo();
      const authService = createAuthService({
        userRepo,
        passwordService,
        tokenService,
        config: testConfig,
      });

      await assert.rejects(
        () => authService.getCurrentUser('nonexistent-id'),
        (err) => {
          assert.equal(err instanceof AppError, true);
          assert.equal(err.statusCode, 401);
          assert.equal(err.code, 'UNAUTHENTICATED');
          assert.equal(err.message, 'User not found');
          return true;
        }
      );
    });

    it('rejects getCurrentUser without userId', async () => {
      const authService = createAuthService({ config: testConfig });
      await assert.rejects(
        () => authService.getCurrentUser(null),
        (err) => {
          assert.equal(err instanceof AppError, true);
          assert.equal(err.statusCode, 400);
          assert.equal(err.code, 'VALIDATION_ERROR');
          return true;
        }
      );
    });
  });
});
