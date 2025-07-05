" Build in Public Bot - Vim Plugin
" Author: Build in Public Bot
" Version: 1.0.0
" Description: Generate code screenshots and tweets from Vim

" Check if bip CLI is installed
if !executable('bip')
  echohl WarningMsg
  echo "Build in Public Bot CLI not found. Please install with: npm install -g build-in-public-bot"
  echohl None
  finish
endif

" Configuration variables
if !exists('g:bip_theme')
  let g:bip_theme = 'dracula'
endif

if !exists('g:bip_line_numbers')
  let g:bip_line_numbers = 1
endif

if !exists('g:bip_font_size')
  let g:bip_font_size = '14px'
endif

if !exists('g:bip_copy_to_clipboard')
  let g:bip_copy_to_clipboard = 1
endif

" Function to get visual selection
function! s:get_visual_selection()
  let [line_start, column_start] = getpos("'<")[1:2]
  let [line_end, column_end] = getpos("'>")[1:2]
  let lines = getline(line_start, line_end)
  if len(lines) == 0
    return ''
  endif
  let lines[-1] = lines[-1][: column_end - (&selection == 'inclusive' ? 1 : 2)]
  let lines[0] = lines[0][column_start - 1:]
  return join(lines, "\n")
endfunction

" Save selection to temp file
function! s:save_to_temp_file(content)
  let temp_file = tempname() . '.' . expand('%:e')
  call writefile(split(a:content, "\n"), temp_file)
  return temp_file
endfunction

" Screenshot current file
function! BipScreenshot() range
  let filename = expand('%:p')
  if empty(filename)
    echo "Please save the file first"
    return
  endif
  
  let cmd = 'bip ss "' . filename . '"'
  let cmd .= ' -t ' . g:bip_theme
  
  if g:bip_line_numbers
    let cmd .= ' -n'
  endif
  
  if g:bip_font_size != ''
    let cmd .= ' -s ' . g:bip_font_size
  endif
  
  if g:bip_copy_to_clipboard
    let cmd .= ' -c'
  endif
  
  " Add line range if visual selection
  if a:firstline != 1 || a:lastline != line('$')
    let cmd .= ' -l ' . a:firstline . '-' . a:lastline
  endif
  
  echo "Generating screenshot..."
  let output = system(cmd)
  echo output
endfunction

" Screenshot selection
function! BipScreenshotSelection()
  let selection = s:get_visual_selection()
  if empty(selection)
    echo "No selection found"
    return
  endif
  
  let temp_file = s:save_to_temp_file(selection)
  
  let cmd = 'bip ss "' . temp_file . '"'
  let cmd .= ' -t ' . g:bip_theme
  
  if g:bip_line_numbers
    let cmd .= ' -n'
  endif
  
  if g:bip_font_size != ''
    let cmd .= ' -s ' . g:bip_font_size
  endif
  
  if g:bip_copy_to_clipboard
    let cmd .= ' -c'
  endif
  
  echo "Generating screenshot..."
  let output = system(cmd)
  echo output
  
  " Clean up temp file
  call delete(temp_file)
endfunction

" Post code with caption
function! BipPostCode(caption) range
  let filename = expand('%:p')
  if empty(filename)
    echo "Please save the file first"
    return
  endif
  
  let cmd = 'bip code "' . filename . '" "' . a:caption . '"'
  let cmd .= ' -t ' . g:bip_theme
  
  if g:bip_line_numbers
    let cmd .= ' -n'
  endif
  
  " Add line range if visual selection
  if a:firstline != 1 || a:lastline != line('$')
    let cmd .= ' -l ' . a:firstline . '-' . a:lastline
  endif
  
  echo "Posting to Twitter..."
  let output = system(cmd)
  echo output
endfunction

" Commands
command! -range=% BipScreenshot <line1>,<line2>call BipScreenshot()
command! -range BipScreenshotSelection call BipScreenshotSelection()
command! -nargs=1 -range=% BipPost <line1>,<line2>call BipPostCode(<q-args>)

" Keybindings (can be customized by user)
nnoremap <leader>bs :BipScreenshot<CR>
vnoremap <leader>bs :BipScreenshotSelection<CR>
nnoremap <leader>bp :BipPost 

" Menu items
if has('menu')
  amenu Plugin.Build\ in\ Public.Screenshot\ File :BipScreenshot<CR>
  amenu Plugin.Build\ in\ Public.Screenshot\ Selection :BipScreenshotSelection<CR>
  amenu Plugin.Build\ in\ Public.Post\ to\ Twitter :BipPost 
endif