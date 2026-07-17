// settings.js
// Two sections, both explicitly required by spec: property branding
// (white-label name + logo — the mechanism that makes this resellable to
// other hotels) and account security (username/password).

window.Alaseel = window.Alaseel || {};

(function () {
  'use strict';

  const T = () => Alaseel.i18n.settings;
  let pane, toast;
  let pendingLogoSrc = null; // set while user is previewing a change, not yet saved

  const Settings = {
    mount(contentPaneEl, toastFn) {
      pane = contentPaneEl;
      toast = toastFn;
      pendingLogoSrc = null;
      render();
    }
  };

  function data() { return Alaseel.store.get(); }

  function currentLogoSrc() {
    if (pendingLogoSrc) return pendingLogoSrc;
    const d = data();
    return (d.hotel && d.hotel.logo_dataurl) || bundledLogoPath('color');
  }

  function bundledLogoPath(variant) {
    return '../assets/logo/logo-' + variant + '.png';
  }

  function render() {
    const d = data();
    pane.innerHTML =
      '<section class="panel">' +
        '<div class="panel-head"><div class="panel-title">' + T().brand_section + '</div></div>' +
        '<div class="settings-body">' +
          '<div class="logo-preview-row">' +
            '<img id="logoPreview" class="logo-preview" src="' + currentLogoSrc() + '" alt="">' +
            '<div class="logo-preview-controls">' +
              '<div class="logo-swatches">' +
                logoSwatch('color', T().logo_variant_color) +
                logoSwatch('white', T().logo_variant_white) +
                logoSwatch('black', T().logo_variant_black) +
              '</div>' +
              '<label class="btn btn-secondary btn-sm file-btn">' + T().logo_upload +
                '<input type="file" id="logoUpload" accept="image/*" hidden>' +
              '</label>' +
              '<p class="hint">' + T().logo_hint + '</p>' +
            '</div>' +
          '</div>' +
          '<div class="field-group field-group-wide">' +
            '<label class="field-label">' + T().hotel_name + '</label>' +
            '<input class="field-input" id="sHotelName" type="text" value="' + esc(d.hotel.name_ar || '') + '" placeholder="' + T().hotel_name_placeholder + '">' +
          '</div>' +
          '<button class="btn btn-primary" id="btnSaveBrand">' + T().save_brand + '</button>' +
        '</div>' +
      '</section>' +

      '<section class="panel" style="margin-top:14px;">' +
        '<div class="panel-head"><div class="panel-title">' + T().security_section + '</div></div>' +
        '<div class="settings-body">' +
          '<div class="auth-error" id="secErr" hidden></div>' +
          '<div class="field-group field-group-wide">' +
            '<label class="field-label">' + T().current_password + '</label>' +
            '<input class="field-input" id="sCurrentPass" type="password" autocomplete="current-password">' +
          '</div>' +
          '<div class="field-group field-group-wide">' +
            '<label class="field-label">' + T().new_username + '</label>' +
            '<input class="field-input" id="sNewUser" type="text" value="' + esc(d.auth.username || '') + '" autocomplete="username">' +
          '</div>' +
          '<div class="field-group field-group-wide">' +
            '<label class="field-label">' + T().new_password + '</label>' +
            '<input class="field-input" id="sNewPass" type="password" autocomplete="new-password">' +
          '</div>' +
          '<button class="btn btn-primary" id="btnSaveSecurity">' + T().save_security + '</button>' +
        '</div>' +
      '</section>';

    wireLogoControls();
    document.getElementById('btnSaveBrand').addEventListener('click', saveBrand);
    document.getElementById('btnSaveSecurity').addEventListener('click', saveSecurity);
  }

  function logoSwatch(variant, label) {
    return '<button class="logo-swatch" data-variant="' + variant + '" title="' + label + '">' +
      '<img src="' + bundledLogoPath(variant) + '" alt="' + label + '"></button>';
  }

  function wireLogoControls() {
    Array.prototype.forEach.call(pane.querySelectorAll('.logo-swatch'), (btn) => {
      btn.addEventListener('click', () => {
        pendingLogoSrc = bundledLogoPath(btn.getAttribute('data-variant'));
        document.getElementById('logoPreview').src = pendingLogoSrc;
      });
    });

    document.getElementById('logoUpload').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        pendingLogoSrc = reader.result; // data: URL
        document.getElementById('logoPreview').src = pendingLogoSrc;
      };
      reader.readAsDataURL(file);
    });
  }

  function saveBrand() {
    const d = data();
    d.hotel.name_ar = document.getElementById('sHotelName').value.trim();
    if (pendingLogoSrc) d.hotel.logo_dataurl = pendingLogoSrc;
    Alaseel.store.touch();
    toast(T().brand_saved);
  }

  async function saveSecurity() {
    const err = document.getElementById('secErr');
    err.hidden = true;
    const currentPassword = document.getElementById('sCurrentPass').value;
    const newUsername = document.getElementById('sNewUser').value.trim();
    const newPassword = document.getElementById('sNewPass').value;

    if (!currentPassword || !newUsername) {
      err.textContent = Alaseel.i18n.auth.fill_all_fields;
      err.hidden = false;
      return;
    }
    if (newPassword && newPassword.length < 6) {
      err.textContent = 'كلمة المرور قصيرة جداً (٦ أحرف على الأقل)';
      err.hidden = false;
      return;
    }

    const res = await window.alaseelAPI.authChangePassword({ currentPassword, newUsername, newPassword });
    if (res.ok) {
      const d = data();
      d.auth.username = newUsername; // keep in-memory cache in sync
      Alaseel.store.touch();
      document.getElementById('sCurrentPass').value = '';
      document.getElementById('sNewPass').value = '';
      toast(T().security_saved);
    } else if (res.error === 'WRONG_CURRENT_PASSWORD') {
      err.textContent = T().wrong_current_password;
      err.hidden = false;
    } else {
      err.textContent = 'حدث خطأ غير متوقع';
      err.hidden = false;
    }
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  Alaseel.settings = Settings;
})();
