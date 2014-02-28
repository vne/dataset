module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		uglify: {
			options: {
				banner: '/*! <%= pkg.name %> <%= pkg.version %> // <%= grunt.template.today("dd.mm.yyyy") %> // <%= pkg.author %> // <%= pkg.homepage %> */\n',
				sourceMap: "dataset.min.map",
				sourceMapName: "dataset.min.map",
				sourceMapIncludeSources: false,
				mangle: false,
				beautify: false
			},
			build: {
				files: {
					"dataset.min.js": [ "dataset.js" ]
				}
			}
		},
		sass: {
			build: {
				options: {
					style: 'compressed',
					sourcemap: true
				},
				files: {
					'css/union.min.css': 'css/union.scss'
				}
			}
		},
		watch: {
			uglify: {
				options: { spawn: false },
				files: ['js/*.js', 'js/views/*'],
				tasks: ["uglify"]
			},
			sass: {
				options: { spawn: false },
				files: ['css/*.scss'],
				tasks: ["sass"]
			}
			// files: ['css/*.scss', 'js/*.js', 'js/views/*'],
			// tasks: ["build"]
		},
		simplemocha: {
			options: {
				globals: ['should'],
				timeout: 3000,
				ignoreLeaks: false,
				ui: 'bdd',
				reporter: 'tap'
			},
			all: {
				src: ["test.js"]
			}
		},
		coffee: {
			options: {
				sourceMap: true
			},
			build: {
				files: {
					"dataset.js": "dataset.coffee"
				}
			}
		},
		clean: {
			build: ["dataset.min.js", "dataset.min.map"]
		},
		mkdir: {
			docs: {
				options: {
					create: ["./ndoc/"]
				}
			}
		},
		execute: {
			benchmark: {
				src: ["./benchmark.js"]
			}
		}

	});
	// grunt.loadNpmTasks('grunt-execute');
	// grunt.loadNpmTasks('grunt-mkdir');
	// grunt.loadNpmTasks('grunt-natural-docs');
	grunt.loadNpmTasks('grunt-simple-mocha');
	// grunt.loadNpmTasks('grunt-markdown');
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-sass');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-coffee');

	grunt.registerTask('build', ['clean', 'coffee', 'simplemocha']);

	grunt.registerTask('default', ['build']);
}



