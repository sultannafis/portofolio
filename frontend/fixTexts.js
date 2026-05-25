const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src/app/admin').concat(walk('./src/components'));

const replaces = [
  ['Dashboard Overview', "{t('admin.dashboard_overview')}"],
  ['Welcome back. Here is your portfolio performance.', "{t('admin.dashboard_subtitle')}"],
  ['Total Projects', "{t('admin.total_projects')}"],
  ['Unread Messages', "{t('admin.unread_messages')}"],
  ['Today Visitors', "{t('admin.today_visitors')}"],
  ['Total Visitors', "{t('admin.total_visitors')}"],
  ['Online Now', "{t('admin.online_now')}"],
  ['Traffic Analytics (Last 30 Days)', "{t('admin.traffic_analytics')}"],
  ['No Analytics Data', "{t('admin.no_analytics')}"],
  ['Your portfolio needs a bit more traffic to generate these charts. Share it around!', "{t('admin.no_analytics_desc')}"],
  ['Manage your portfolio projects', "{t('admin.manage_projects')}"],
  ['Manage your skills and expertise', "{t('admin.manage_skills')}"],
  ['Manage your certifications', "{t('admin.manage_certificates')}"],
  ['Manage your professional experience', "{t('admin.manage_experiences')}"],
  ['Manage your contact messages', "{t('admin.manage_messages')}"],
  ['Manage your portfolio settings', "{t('admin.manage_settings')}"],
  ['>Add Project<', ">{t('admin.add_project')}<"],
  ['>Add Skill<', ">{t('admin.add_skill')}<"],
  ['>Add Certificate<', ">{t('admin.add_certificate')}<"],
  ['>Add Experience<', ">{t('admin.add_experience')}<"],
  ['>Create Project<', ">{t('admin.create_project')}<"],
  ['>Create Skill<', ">{t('admin.create_skill')}<"],
  ['>Create Certificate<', ">{t('admin.create_certificate')}<"],
  ['>Create Experience<', ">{t('admin.create_experience')}<"],
  ['>Edit Project<', ">{t('admin.edit_project')}<"],
  ['>Edit Skill<', ">{t('admin.edit_skill')}<"],
  ['>Edit Certificate<', ">{t('admin.edit_certificate')}<"],
  ['>Edit Experience<', ">{t('admin.edit_experience')}<"],
  ['\'Project deleted!\'', "t('admin.toast.deleted')"],
  ['\'Skill deleted!\'', "t('admin.toast.deleted')"],
  ['\'Certificate deleted!\'', "t('admin.toast.deleted')"],
  ['\'Experience deleted!\'', "t('admin.toast.deleted')"],
  ['\'Project created!\'', "t('admin.toast.created')"],
  ['\'Project updated!\'', "t('admin.toast.updated')"],
  ['\'Skill created!\'', "t('admin.toast.created')"],
  ['\'Skill updated!\'', "t('admin.toast.updated')"],
  ['\'Certificate created!\'', "t('admin.toast.created')"],
  ['\'Certificate updated!\'', "t('admin.toast.updated')"],
  ['\'Experience created!\'', "t('admin.toast.created')"],
  ['\'Experience updated!\'', "t('admin.toast.updated')"],
  ['\'Settings updated successfully!\'', "t('admin.toast.updated')"],
  ['\'Failed to fetch projects\'', "t('admin.toast.fetch_failed')"],
  ['\'Failed to fetch skills\'', "t('admin.toast.fetch_failed')"],
  ['\'Failed to fetch certificates\'', "t('admin.toast.fetch_failed')"],
  ['\'Failed to fetch experiences\'', "t('admin.toast.fetch_failed')"],
  ['\'Failed to fetch settings\'', "t('admin.toast.fetch_failed')"],
  ['\'Failed to delete project\'', "t('admin.toast.failed')"],
  ['\'Failed to create project\'', "t('admin.toast.failed')"],
  ['\'Failed to update project\'', "t('admin.toast.failed')"]
];

let totalModifications = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  if (!content.includes('useTranslation') && !file.includes('layout.tsx')) {
    if (content.match(/import \{ useEffect/)) {
      content = content.replace(/import \{ useEffect/, "import { useTranslation } from '@/hooks/useTranslation';\nimport { useEffect");
    } else if (content.match(/import \{ useState/)) {
      content = content.replace(/import \{ useState/, "import { useTranslation } from '@/hooks/useTranslation';\nimport { useState");
    } else if (content.match(/import React/)) {
      content = content.replace(/import React/, "import { useTranslation } from '@/hooks/useTranslation';\nimport React");
    } else {
        content = "import { useTranslation } from '@/hooks/useTranslation';\n" + content;
    }
    
    // Add t hook for normal default functions
    content = content.replace(/(export default function [A-Za-z0-9_]+\([^)]*\)\s*\{)/g, "$1\n  const { t } = useTranslation();");
  }

  for (let [searchStr, replace] of replaces) {
    if (content.includes(searchStr)) {
      content = content.split(searchStr).join(replace);
      changed = true;
    }
  }

  // Also replace simple labels like <label>Title</label>
  const formLabels = [
    'Title', 'Description', 'Category', 'Year', 'Demo URL', 'Github URL', 
    'Name', 'Icon', 'Proficiency', 'Company', 'Position', 'Start Date', 'End Date', 
    'Issuer', 'Issue Date', 'Expiry Date', 'Credential URL', 'Site Title', 
    'Site Description', 'Full Name', 'Biography', 'Years of Experience', 
    'Projects Completed', 'Happy Clients', 'Meta Keywords', 'Resume URL', 'Profile Image'
  ];

  for (let label of formLabels) {
    let searchStr = ">" + label + "</label>";
    let replaceStr = ">{t('admin.form." + label.toLowerCase().replace(/ /g, '_') + "')}</label>";
    if (content.includes(searchStr)) {
      content = content.split(searchStr).join(replaceStr);
      changed = true;
    }
  }

  if (changed) {
    // Make sure we have t hook if we just put {t( in file
    if (!content.includes("const { t } = useTranslation();")) {
        content = content.replace(/(export default function [A-Za-z0-9_]+\([^)]*\)\s*\{)/g, "$1\n  const { t } = useTranslation();");
    }
    fs.writeFileSync(file, content);
    console.log('Modified:', file);
    totalModifications++;
  }
});
console.log('Total files modified:', totalModifications);
