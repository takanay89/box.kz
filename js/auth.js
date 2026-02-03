// =============================================
// AUTH MODULE
// =============================================

class Auth {
  constructor() {
    this.supabase = null;
  }

  async init() {
    if (typeof supabase === 'undefined') {
      throw new Error('Supabase library not loaded');
    }
    
    this.supabase = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
    return this.supabase;
  }

  async signInWithEmail(email, password) {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      const { data: companyId, error: companyError } = await this.supabase.rpc(
        'get_user_current_company',
        { p_user_id: data.user.id }
      );

      if (companyError) throw companyError;

      if (!companyId) {
        localStorage.removeItem('company_id');
        await this.supabase.auth.signOut();
        throw new Error('Компания не найдена');
      }

      localStorage.setItem('company_id', companyId);

      return {
        user: data.user,
        companyId
      };
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  async signUpWithEmail(email, password, fullName) {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName
          }
        }
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }

  async signOut() {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) throw error;
      
      window.location.href = '/login.html';
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  async getCurrentUser() {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      
      if (!user) return null;

      const companyId = localStorage.getItem('company_id');
      if (!companyId) return null;

      return {
        ...user,
        companyId
      };
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  async checkAuth() {
    const user = await this.getCurrentUser();
    
    if (!user && !window.location.pathname.includes('login')) {
      window.location.href = '/login.html';
      return false;
    }
    
    if (user && window.location.pathname.includes('login')) {
      window.location.href = '/index.html';
      return false;
    }
    
    return user;
  }

  async resetPassword(email) {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password.html`
      });

      if (error) throw error;
      
      return { success: true, message: 'Письмо для сброса пароля отправлено на ваш email' };
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  }

  async updatePassword(newPassword) {
    try {
      const { error } = await this.supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      
      return { success: true, message: 'Пароль успешно обновлен' };
    } catch (error) {
      console.error('Update password error:', error);
      throw error;
    }
  }

  // =============================================
  // USER INVITATIONS
  // =============================================
  async inviteUser(email, role) {
    try {
      const { data: userData } = await this.supabase.auth.getUser();
      if (!userData.user) throw new Error('Не авторизован');

      const companyId = localStorage.getItem('company_id');
      if (!companyId) throw new Error('Компания не выбрана');

      const { data: invitationId, error } = await this.supabase.rpc('invite_user', {
        p_company_id: companyId,
        p_email: email.toLowerCase(),
        p_role: role,
        p_invited_by: userData.user.id
      });

      if (error) throw error;

      // Получаем токен приглашения
      const { data: invitation } = await this.supabase
        .from('user_invitations')
        .select('token')
        .eq('id', invitationId)
        .single();

      // Отправляем email через Edge Function
      if (invitation) {
        await this.supabase.functions.invoke('send-invitation', {
          body: {
            email,
            token: invitation.token,
            companyName: 'POS Kassir',
            inviterName: userData.user.email,
            role: this.getRoleDisplayName(role)
          }
        });
      }

      return {
        invitationId,
        message: 'Приглашение создано и отправлено на email!'
      };
    } catch (error) {
      console.error('Invite user error:', error);
      throw error;
    }
  }

  async acceptInvitation(token) {
    try {
      const { data: userData } = await this.supabase.auth.getUser();
      if (!userData.user) throw new Error('Не авторизован');

      const { data, error } = await this.supabase.rpc('accept_invitation', {
        p_token: token,
        p_user_id: userData.user.id
      });

      if (error) throw error;

      return {
        success: true,
        message: 'Приглашение принято! Добро пожаловать!'
      };
    } catch (error) {
      console.error('Accept invitation error:', error);
      throw error;
    }
  }

  getRoleDisplayName(role) {
    const roles = {
      admin: 'Администратор',
      manager: 'Менеджер',
      cashier: 'Кассир',
      accountant: 'Бухгалтер',
      warehouse: 'Кладовщик',
      seller: 'Продавец'
    };
    return roles[role] || role;
  }
}

// Экспорт экземпляра Auth
const auth = new Auth();
