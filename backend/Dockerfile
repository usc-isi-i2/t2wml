# A dockerfile for running the t2wml backend
FROM python:3.7-stretch

COPY . /src

RUN pip install t2wml-api
RUN pip install -r /src/requirements.txt

WORKDIR /src
ENTRYPOINT python t2wml-server.py
