from setuptools import setup

setup(name='mturkutils',
      version='0.1.0',
      description='Scripts for working with Amazon Mechanical Turk',
      long_description='A set of scripts that somewhat replicate the original MTurk command line tools',
      classifiers=[
          'Development Status :: 4 - Beta',
          'License :: OSI Approved :: MIT License',
          'Programming Language :: Python :: 3.7',
      ],
      keywords='aws, mturk',
      url='https://bitbucket.org/hlplab/mturkutils',
      author='Andrew Watts',
      author_email='andrew.watts@rochester.edu',
      license='MIT',
      packages=['mturkutils',],
      install_requires=[
          'boto',
          'boto3',
          'unicodecsv',
          'ruamel.yaml',
          'ruamel.yaml.clib',
          'six',
          'xmltodict',
      ],
      include_package_data=True,
      zip_safe=False)
