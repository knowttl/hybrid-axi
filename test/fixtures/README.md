# Test TLS material

The certificate and key in this directory are synthetic, public test fixtures for the local HTTPS upstream only.
They contain no account credentials and must never be used outside tests.
The certificate is self-signed for `127.0.0.1`; the fake adapter trusts it explicitly and keeps TLS verification enabled.
