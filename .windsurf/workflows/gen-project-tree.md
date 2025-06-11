---
description: Generate a project tree 
---

Generate a project tree using this terminal command and write it to a file 

tree -I "node_modules|.git|.DS_Store|.svelte-kit|docs" -L 6 > project-tree.md