// Comprehensive syntax highlighting theme format
export interface CodeTheme {
  name: string;
  author?: string;
  variant: 'dark' | 'light';
  
  // Core colors
  background: string;
  foreground: string;
  cursor?: string;
  selection?: string;
  currentLine?: string;
  lineNumber?: string;
  
  // Gradient support
  gradientFrom?: string;
  gradientTo?: string;
  
  // Shader background support
  shader?: {
    name?: string;
    colors?: {
      primary?: string;
      secondary?: string;
      accent?: string;
      background?: string;
    };
    parameters?: {
      intensity?: number;
      scale?: number;
    };
  };
  
  // Base syntax colors
  comment: string;
  string: string;
  number: string;
  keyword: string;
  operator: string;
  function: string;
  variable: string;
  constant: string;
  type: string;
  class: string;
  
  // Extended syntax colors
  property: string;
  attribute: string;
  tag: string;
  regexp: string;
  punctuation?: string;
  decorator?: string;
  
  // Language-specific
  markup?: {
    heading?: string;
    bold?: string;
    italic?: string;
    link?: string;
    code?: string;
    quote?: string;
    list?: string;
  };
  
  // Diff colors
  diff?: {
    added?: string;
    removed?: string;
    changed?: string;
  };
  
  // Additional UI elements
  ui?: {
    error?: string;
    warning?: string;
    info?: string;
    success?: string;
  };
}

// Mapping for highlight.js token types to our theme colors
export function getTokenColorMapping(theme: CodeTheme): Record<string, string> {
  return {
    // Comments and documentation
    'comment': theme.comment,
    'quote': theme.comment,
    'doctag': theme.comment,
    'formula': theme.comment,
    
    // Strings and literals
    'string': theme.string,
    'regexp': theme.regexp || theme.string,
    'link': theme.markup?.link || theme.string,
    'symbol': theme.string,
    'char': theme.string,
    'subst': theme.variable,
    
    // Numbers
    'number': theme.number,
    'literal': theme.number,
    
    // Keywords and language constructs
    'keyword': theme.keyword,
    'selector-tag': theme.keyword,
    'operator': theme.operator || theme.keyword,
    
    // Functions and methods
    'title': theme.function,
    'function': theme.function,
    'title.function': theme.function,
    'title.function.invoke': theme.function,
    
    // Types and classes
    'type': theme.type,
    'class': theme.class || theme.type,
    'title.class': theme.class || theme.type,
    'title.class.inherited': theme.class || theme.type,
    'built_in': theme.type,
    'builtin': theme.type,
    
    // Variables and constants
    'variable': theme.variable,
    'params': theme.variable,
    'variable.constant': theme.constant,
    'variable.language': theme.constant,
    
    // Properties and attributes
    'property': theme.property,
    'attribute': theme.attribute,
    'attr': theme.attribute,
    'selector-attr': theme.attribute,
    'selector-class': theme.class || theme.type,
    'selector-id': theme.attribute,
    'selector-pseudo': theme.attribute,
    
    // Tags (HTML/XML)
    'tag': theme.tag,
    'name': theme.tag,
    'selector': theme.tag,
    
    // Markup
    'strong': theme.markup?.bold || theme.foreground,
    'emphasis': theme.markup?.italic || theme.foreground,
    'bullet': theme.markup?.list || theme.operator || theme.foreground,
    'code': theme.markup?.code || theme.string,
    'section': theme.markup?.heading || theme.function,
    
    // Diff
    'addition': theme.diff?.added || theme.string,
    'deletion': theme.diff?.removed || theme.keyword,
    
    // Meta
    'meta': theme.comment,
    'meta-keyword': theme.keyword,
    'meta-string': theme.string,
    
    // Other
    'punctuation': theme.punctuation || theme.foreground,
    'template-tag': theme.keyword,
    'template-variable': theme.variable,
    
    // Default
    'text': theme.foreground,
    undefined: theme.foreground,
  };
}