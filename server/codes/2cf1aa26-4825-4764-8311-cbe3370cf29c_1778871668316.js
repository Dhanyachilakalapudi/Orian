<!DOCTYPE html>
<html>
<head>
  <title>My Project</title>
  <link rel=\"stylesheet\" href=\"assets/stylesheets/style.css\">
</head>
<body>
  <h1>Hello World!</h1>
  <script src=\"assets/scripts/script.js\"></script>
</body>
</html>' > src/main/index.html

# Create the CSS file
echo '.body {
  background-color: #f2f2f2;
}' > src/main/assets/stylesheets/style.css

# Create the JavaScript file
echo 'console.log(\"Hello World!\");' > src/main/assets/scripts/script.js

# Create a package.json file for our project
echo '{\"name\": \"my-project\",\"version\": \"1.0.0\",\"description\": \"My project\"}' > package.json

# Initialize npm
npm init

# Install required dependencies (in this case, none)
echo 'No dependencies required' > package.json

# Log important outputs
echo 'Project created successfully!'
echo 'Directory structure:'
ls -l
echo 'Files created:'
ls src/main
echo 'package.json created:'
cat package.json
",
  "description": "Sets up a local development environment with HTML, CSS, and JavaScript",
  "expected_output": "Project created successfully!
Directory structure:
total 0
drwxr-xr-x 3 user user  21 May 15 10:32 .
drwxr-xr-x 3 user user  21 May 15 10:32 ..
drwxr-xr-x 3 user user  21 May 15 10:32 src
-rw-r--r-- 1 user user  38 May 15 10:32 package.json
Files created:
total 0
drwxr-xr-x 3 user user  21 May 15 10:32 .
drwxr-xr-x 3 user user  21 May 15 10:32 ..
-rw-r--r-- 1 user user  43 May 15 10:32 index.html
drwxr-xr-x 3 user user  21 May 15 10:32 assets
-rw-r--r-- 1 user user  13 May 15 10:32 script.js
drwxr-xr-x 3 user user  21 May 15 10:32 stylesheets
-rw-r--r-- 1 user user  20 May 15 10:32 style.css
package.json created:
{\"name\": \"my-project\",\"version\": \"1.0.0\",\"description\": \"My project\"}
"
}