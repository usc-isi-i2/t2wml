import setuptools
import os

REQUIREMENTS = [
    'PyYAML>=5.1.2',
    'SPARQLWrapper>=1.8.4',
    'pandas>=1.0.3',
    'etk>=2.1.7',
    'en_core_web_sm@https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-2.2.5/en_core_web_sm-2.2.5.tar.gz',
]

setuptools.setup(
    name="t2wml-api", 
    version="0.0.1",
    description="Programming API for T2WML, a cell-based Language for mapping tables into wikidata records",
    long_description=open(os.path.join(os.path.dirname(__file__), 'README.md'), encoding='utf-8').read(),
    long_description_content_type="text/markdown",
	author="USC ISI and The Research Software Company",
    url="https://github.com/usc-isi-i2/t2wml/",
    packages=setuptools.find_packages(),
    classifiers=[
        "Programming Language :: Python :: 3"

    ],
    python_requires='>=3.6',
    install_requires=REQUIREMENTS,
)