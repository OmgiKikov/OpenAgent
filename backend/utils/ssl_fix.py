import os
import certifi
import ssl
import logging

logger = logging.getLogger(__name__)


def fix_ssl_certificates():
    """
    Configure SSL certificates for Python requests by setting environment variables
    to use the certifi certificate bundle.
    """
    try:
        cert_path = certifi.where()
        if os.path.exists(cert_path):
            logger.info(f"Setting SSL certificate path to: {cert_path}")

            # Set environment variables used by various libraries
            os.environ['SSL_CERT_FILE'] = cert_path
            os.environ['REQUESTS_CA_BUNDLE'] = cert_path
            os.environ['CURL_CA_BUNDLE'] = cert_path

            # Also configure the default SSL context
            ssl._create_default_https_context = ssl.create_default_context

            logger.info("SSL certificate configuration completed successfully")
            return True
        else:
            logger.error(f"Certificate file not found at: {cert_path}")
            return False
    except Exception as e:
        logger.error(f"Error configuring SSL certificates: {str(e)}")
        return False
