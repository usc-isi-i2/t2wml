# A dockerfile for running the t2wml backend
FROM python:3.7-stretch

RUN mkdir /src
COPY requirements.txt /src/requirements.txt

RUN git clone https://github.com/usc-isi-i2/t2wml-api.git
RUN pip install -e ./t2wml-api

RUN pip install -r /src/requirements.txt

COPY . /src

WORKDIR /src
EXPOSE 13000
ENTRYPOINT python t2wml-server.py --public-server --causx
