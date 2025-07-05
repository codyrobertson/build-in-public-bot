;;; bip.el --- Build in Public Bot integration for Emacs -*- lexical-binding: t -*-

;; Author: Build in Public Bot
;; Version: 1.0.0
;; Package-Requires: ((emacs "24.3"))
;; Keywords: tools, convenience
;; URL: https://github.com/yourusername/build-in-public-bot

;;; Commentary:

;; This package provides Emacs integration for Build in Public Bot.
;; Generate code screenshots and post to Twitter directly from Emacs.

;;; Code:

(require 'cl-lib)

(defgroup bip nil
  "Build in Public Bot integration."
  :group 'tools)

(defcustom bip-executable "bip"
  "Path to the bip executable."
  :type 'string
  :group 'bip)

(defcustom bip-theme "dracula"
  "Default theme for screenshots."
  :type 'string
  :group 'bip)

(defcustom bip-line-numbers t
  "Whether to show line numbers in screenshots."
  :type 'boolean
  :group 'bip)

(defcustom bip-font-size "14px"
  "Font size for screenshots."
  :type 'string
  :group 'bip)

(defcustom bip-copy-to-clipboard t
  "Whether to copy screenshot path to clipboard."
  :type 'boolean
  :group 'bip)

(defcustom bip-window-controls t
  "Whether to show window controls in screenshots."
  :type 'boolean
  :group 'bip)

(defun bip--check-executable ()
  "Check if bip executable exists."
  (unless (executable-find bip-executable)
    (error "Build in Public Bot CLI not found. Please install with: npm install -g build-in-public-bot")))

(defun bip--build-command (base-cmd &optional line-start line-end)
  "Build command with options."
  (let ((cmd base-cmd))
    (setq cmd (concat cmd " -t " bip-theme))
    (when bip-line-numbers
      (setq cmd (concat cmd " -n")))
    (when bip-font-size
      (setq cmd (concat cmd " -s " bip-font-size)))
    (when bip-copy-to-clipboard
      (setq cmd (concat cmd " -c")))
    (unless bip-window-controls
      (setq cmd (concat cmd " --no-window")))
    (when (and line-start line-end)
      (setq cmd (concat cmd " -l " (number-to-string line-start) "-" (number-to-string line-end))))
    cmd))

(defun bip-screenshot-file ()
  "Generate a screenshot of the current file."
  (interactive)
  (bip--check-executable)
  (let* ((filename (buffer-file-name))
         (cmd (bip--build-command (format "%s ss \"%s\"" bip-executable filename))))
    (unless filename
      (error "Buffer must be saved to a file"))
    (message "Generating screenshot...")
    (let ((output (shell-command-to-string cmd)))
      (message "%s" (string-trim output)))))

(defun bip-screenshot-region (start end)
  "Generate a screenshot of the selected region."
  (interactive "r")
  (bip--check-executable)
  (let* ((temp-file (make-temp-file "bip-" nil (concat "." (file-name-extension (buffer-file-name) t))))
         (content (buffer-substring-no-properties start end))
         (line-start (line-number-at-pos start))
         (line-end (line-number-at-pos end)))
    (with-temp-file temp-file
      (insert content))
    (let* ((cmd (bip--build-command (format "%s ss \"%s\"" bip-executable temp-file)))
           (output (shell-command-to-string cmd)))
      (delete-file temp-file)
      (message "%s" (string-trim output)))))

(defun bip-screenshot-buffer ()
  "Generate a screenshot of the entire buffer."
  (interactive)
  (if (buffer-file-name)
      (bip-screenshot-file)
    (bip-screenshot-region (point-min) (point-max))))

(defun bip-post-code (caption)
  "Post current file to Twitter with CAPTION."
  (interactive "sEnter tweet caption: ")
  (bip--check-executable)
  (let* ((filename (buffer-file-name))
         (cmd (bip--build-command (format "%s code \"%s\" \"%s\"" bip-executable filename caption))))
    (unless filename
      (error "Buffer must be saved to a file"))
    (message "Posting to Twitter...")
    (let ((output (shell-command-to-string cmd)))
      (message "%s" (string-trim output)))))

(defun bip-post-region (start end caption)
  "Post selected region to Twitter with CAPTION."
  (interactive "r\nsEnter tweet caption: ")
  (bip--check-executable)
  (let* ((filename (buffer-file-name))
         (line-start (line-number-at-pos start))
         (line-end (line-number-at-pos end))
         (cmd (bip--build-command 
               (format "%s code \"%s\" \"%s\"" bip-executable filename caption)
               line-start line-end)))
    (unless filename
      (error "Buffer must be saved to a file"))
    (message "Posting to Twitter...")
    (let ((output (shell-command-to-string cmd)))
      (message "%s" (string-trim output)))))

(defun bip-list-themes ()
  "List available themes."
  (interactive)
  (bip--check-executable)
  (let ((output (shell-command-to-string (format "%s ss --list" bip-executable))))
    (with-output-to-temp-buffer "*BIP Themes*"
      (princ output))))

(defun bip-set-theme (theme)
  "Set the theme for screenshots."
  (interactive
   (list (completing-read "Theme: " 
                         '("dracula" "github-dark" "tokyo-night" "nord" 
                           "one-dark" "monokai-pro" "catppuccin-mocha" 
                           "synthwave-84" "gruvbox-dark" "ayu-dark"))))
  (setq bip-theme theme)
  (message "BIP theme set to: %s" theme))

;; Define minor mode
(define-minor-mode bip-mode
  "Minor mode for Build in Public Bot integration."
  :lighter " BIP"
  :keymap (let ((map (make-sparse-keymap)))
            (define-key map (kbd "C-c b s") 'bip-screenshot-file)
            (define-key map (kbd "C-c b r") 'bip-screenshot-region)
            (define-key map (kbd "C-c b b") 'bip-screenshot-buffer)
            (define-key map (kbd "C-c b p") 'bip-post-code)
            (define-key map (kbd "C-c b P") 'bip-post-region)
            (define-key map (kbd "C-c b t") 'bip-set-theme)
            (define-key map (kbd "C-c b l") 'bip-list-themes)
            map))

;; Add menu
(easy-menu-define bip-menu bip-mode-map
  "Menu for Build in Public Bot."
  '("BIP"
    ["Screenshot File" bip-screenshot-file t]
    ["Screenshot Region" bip-screenshot-region t]
    ["Screenshot Buffer" bip-screenshot-buffer t]
    "---"
    ["Post Code" bip-post-code t]
    ["Post Region" bip-post-region t]
    "---"
    ["Set Theme" bip-set-theme t]
    ["List Themes" bip-list-themes t]))

(provide 'bip)

;;; bip.el ends here