const defaultYamlContent = "### A simplest sample of T2WML.\n### Replace all #PLACEHOLDER below to start.\nstatementMapping:\n  region:\n      left: #CHAR\n      right: #CHAR\n      top: #INT\n      bottom: #INT\n  template:\n    subject: #EXPRESSION/QNODE\n    property: #EXPRESSION/PNODE\n    value: #=value[$col, $row] #MOST COMMON EXPRESSION\n    qualifier:\n      - property: #EXPRESSION/PNODE\n        value: #EXPRESSION/VALUE";

export { defaultYamlContent };
