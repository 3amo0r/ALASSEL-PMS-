// auth.js
// Renders every auth-related state (first-run setup / recovery-code reveal /
// login / forgot-password / forced reset) inside the single #authScreen
// element. Nothing here ever opens a new window — views replace each
// other's content in place.

window.Alaseel = window.Alaseel || {};

(function () {
  'use strict';

  const t = () => Alaseel.i18n.auth;
  let root;
  let onAuthenticated = function () {};

  const Auth = {
    mount(el, opts) {
      root = el;
      if (opts && opts.onAuthenticated) onAuthenticated = opts.onAuthenticated;
      const data = Alaseel.store.get();
      if (!data.users || !data.users.length) {
        renderSetup();
      } else {
        renderLogin();
      }
    }
  };

  function show() { root.hidden = false; }
  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    return Promise.resolve();
  }

  /* ---------------- shell wrapper ---------------- */
  function shell(innerHtml) {
    root.innerHTML =
      '<div class="auth-card">' +
        '<div class="auth-brand">' +
          '<img src="' + brandLogoSrc() + '" alt="" class="auth-logo" onerror="this.style.display=\'none\'">' +
        '</div>' +
        innerHtml +
      '</div>';
    show();
  }

  function brandLogoSrc() {
    const data = Alaseel.store.get();
    if (data && data.hotel && data.hotel.logo_dataurl) return data.hotel.logo_dataurl;
    return '../assets/logo/logo-color.png';
  }

  function hotelName() {
    const data = Alaseel.store.get();
    return (data && data.hotel && data.hotel.name_ar) || Alaseel.i18n.app_name;
  }

  /* ---------------- 1. first-run setup ---------------- */
  function renderSetup() {
    shell(
      '<h1 class="auth-title">' + t().setup_title + '</h1>' +
      '<p class="auth-subtitle">' + t().setup_subtitle + '</p>' +
      '<div class="auth-error" id="authErr" hidden></div>' +
      '<label class="field-label">' + t().username + '</label>' +
      '<input class="field-input" id="suUser" type="text" autocomplete="username">' +
      '<label class="field-label">' + t().password + '</label>' +
      '<input class="field-input" id="suPass" type="password" autocomplete="new-password">' +
      '<label class="field-label">' + t().confirm_password + '</label>' +
      '<input class="field-input" id="suPass2" type="password" autocomplete="new-password">' +
      '<button class="btn btn-primary btn-block" id="suSubmit">' + t().create_account + '</button>'
    );

    document.getElementById('suSubmit').addEventListener('click', async () => {
      const username = document.getElementById('suUser').value.trim();
      const pass = document.getElementById('suPass').value;
      const pass2 = document.getElementById('suPass2').value;
      const err = document.getElementById('authErr');
      err.hidden = true;

      if (!username || !pass || !pass2) return showErr(err, t().fill_all_fields);
      if (username.length < 3) return showErr(err, 'اسم المستخدم قصير جداً (٣ أحرف على الأقل)');
      if (pass.length < 6) return showErr(err, 'كلمة المرور قصيرة جداً (٦ أحرف على الأقل)');
      if (pass !== pass2) return showErr(err, t().password_mismatch);

      const res = await window.alaseelAPI.authSetup({ username, password: pass });
      if (res.ok) renderRecoveryReveal(res.recoveryCode, renderLogin);
    });
  }

  /* ---------------- 2. recovery code reveal (shown once) ---------------- */
  function renderRecoveryReveal(code, nextView) {
    shell(
      '<h1 class="auth-title">' + t().recovery_reveal_title + '</h1>' +
      '<p class="auth-subtitle">' + t().recovery_reveal_body + '</p>' +
      '<div class="recovery-code-display" id="recoveryCode">' + code + '</div>' +
      '<button class="btn btn-secondary btn-block" id="btnCopy">' + t().recovery_copy + '</button>' +
      '<button class="btn btn-primary btn-block" id="btnSavedContinue" style="margin-top:10px;">' + t().recovery_confirm_saved + '</button>'
    );

    document.getElementById('btnCopy').addEventListener('click', async () => {
      await copyToClipboard(code);
      const btn = document.getElementById('btnCopy');
      btn.textContent = t().recovery_copied;
      setTimeout(() => { btn.textContent = t().recovery_copy; }, 1800);
    });
    document.getElementById('btnSavedContinue').addEventListener('click', () => nextView());
  }

  /* ---------------- 3. login ---------------- */
  function renderLogin() {
    shell(
      '<h1 class="auth-title">' + hotelName() + '</h1>' +
      '<p class="auth-subtitle">' + t().login_subtitle + '</p>' +
      '<div class="auth-error" id="authErr" hidden></div>' +
      '<label class="field-label">' + t().username + '</label>' +
      '<input class="field-input" id="liUser" type="text" autocomplete="username">' +
      '<label class="field-label">' + t().password + '</label>' +
      '<input class="field-input" id="liPass" type="password" autocomplete="current-password">' +
      '<button class="btn btn-primary btn-block" id="liSubmit">' + t().login_button + '</button>' +
      '<button class="link-btn" id="liForgot">' + t().forgot_password + '</button>'
    );

    const submit = async () => {
      const username = document.getElementById('liUser').value.trim();
      const pass = document.getElementById('liPass').value;
      const err = document.getElementById('authErr');
      err.hidden = true;
      if (!username || !pass) return showErr(err, t().fill_all_fields);

      const res = await window.alaseelAPI.authLogin({ username, password: pass });
      if (res.ok) {
        onAuthenticated();
      } else {
        showErr(err, t().invalid_credentials);
      }
    };

    document.getElementById('liSubmit').addEventListener('click', submit);
    document.getElementById('liPass').addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    document.getElementById('liForgot').addEventListener('click', renderRecoveryEntry);
  }

  /* ---------------- 4. recovery code entry ---------------- */
  function renderRecoveryEntry() {
    shell(
      '<h1 class="auth-title">' + t().recovery_title + '</h1>' +
      '<p class="auth-subtitle">' + t().recovery_subtitle + '</p>' +
      '<div class="auth-error" id="authErr" hidden></div>' +
      '<label class="field-label">' + t().recovery_code_label + '</label>' +
      '<input class="field-input mono-input" id="rcCode" type="text" placeholder="XXXX-XXXX-XXXX-XXXX">' +
      '<button class="btn btn-primary btn-block" id="rcSubmit">' + t().recovery_verify + '</button>' +
      '<button class="link-btn" id="rcBack">' + t().back_to_login + '</button>'
    );

    document.getElementById('rcSubmit').addEventListener('click', async () => {
      const code = document.getElementById('rcCode').value.trim();
      const err = document.getElementById('authErr');
      err.hidden = true;
      if (!code) return showErr(err, t().fill_all_fields);

      const res = await window.alaseelAPI.authVerifyRecovery({ code });
      if (res.ok) {
        renderForcedReset();
      } else {
        showErr(err, t().recovery_invalid);
      }
    });
    document.getElementById('rcBack').addEventListener('click', renderLogin);
  }

  /* ---------------- 5. forced reset (mandatory, no skip) ---------------- */
  function renderForcedReset() {
    shell(
      '<h1 class="auth-title">' + t().reset_title + '</h1>' +
      '<p class="auth-subtitle">' + t().reset_subtitle + '</p>' +
      '<div class="auth-error" id="authErr" hidden></div>' +
      '<label class="field-label">' + t().new_username + '</label>' +
      '<input class="field-input" id="frUser" type="text" autocomplete="username">' +
      '<label class="field-label">' + t().new_password + '</label>' +
      '<input class="field-input" id="frPass" type="password" autocomplete="new-password">' +
      '<label class="field-label">' + t().confirm_password + '</label>' +
      '<input class="field-input" id="frPass2" type="password" autocomplete="new-password">' +
      '<button class="btn btn-primary btn-block" id="frSubmit">' + t().save_continue + '</button>'
    );
    // Deliberately no "back" link here — the reset is mandatory once a
    // valid recovery code has been used, matching the original requirement.

    document.getElementById('frSubmit').addEventListener('click', async () => {
      const username = document.getElementById('frUser').value.trim();
      const pass = document.getElementById('frPass').value;
      const pass2 = document.getElementById('frPass2').value;
      const err = document.getElementById('authErr');
      err.hidden = true;

      if (!username || !pass || !pass2) return showErr(err, t().fill_all_fields);
      if (username.length < 3) return showErr(err, 'اسم المستخدم قصير جداً (٣ أحرف على الأقل)');
      if (pass.length < 6) return showErr(err, 'كلمة المرور قصيرة جداً (٦ أحرف على الأقل)');
      if (pass !== pass2) return showErr(err, t().password_mismatch);

      const res = await window.alaseelAPI.authReset({ newUsername: username, newPassword: pass });
      if (res.ok) renderRecoveryReveal(res.recoveryCode, renderLogin);
    });
  }

  function showErr(el, msg) { el.textContent = msg; el.hidden = false; }

  Alaseel.auth = Auth;
})();
