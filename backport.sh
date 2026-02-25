git reset HEAD~1
rm ./backport.sh
git cherry-pick 3d3bbe22dba4700ccbc9deb949cb37d2c3c176fa
echo 'Resolve conflicts and force push this branch.\n\nTo backport translations run: bin/i18n/merge-translations <release-branch>'
